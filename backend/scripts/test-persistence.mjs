// Real PostgreSQL and actual routes, with synthetic accounts and simulated AI.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dep=createRequire(root+'/backend/package.json');
const ts=dep('typescript');
const {drizzle}=dep('drizzle-orm/pglite');
const {eq}=dep('drizzle-orm');
const pg=new PGlite();
let db,aiCalls=0,quotaCalls=0;
const modules=new Map();
const auth={userId:null};
const mocks={
  '@/lib/auth/require-auth':{getAuthFromRequest:()=>auth.userId?{userId:auth.userId}:null},
  '@/lib/ai/conversation':{runConversationTurn:async()=>{aiCalls++;return{reply:'What did you learn?',mistakes:[{category:'tense_usage',originalText:'I go',correctedText:'I went',note:'Gunakan bentuk lampau.'}]};}},
  '@/lib/ai/correction-check':{finalizeInterviewCorrections:async()=>{throw Error('Interview correction check was not expected');}},
  '@/lib/rate-limit':{consumeQuota:async()=>{quotaCalls++;return{allowed:true};}},
  '@/lib/http/cors':{jsonCors:(data,o)=>({status:o?.status??200,data}),corsPreflight:()=>({status:204})},
};
function load(relative){
  if(modules.has(relative))return modules.get(relative);
  const js=ts.transpileModule(fs.readFileSync(path.join(root,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const out={};modules.set(relative,out);
  vm.runInNewContext(js,{exports:out,console,Date,require:name=>{
    if(name==='@/lib/db')return{db};
    if(Object.hasOwn(mocks,name))return mocks[name];
    if(name.startsWith('@/'))return load('backend/src/'+name.slice(2)+'.ts');
    if(name.startsWith('./'))return load(path.posix.join(path.posix.dirname(relative),name)+'.ts');
    if(name==='drizzle-orm'||name==='drizzle-orm/pg-core'||name==='zod'||name==='node:crypto')return dep(name);
    throw Error('Unexpected external import: '+name);
  }},{filename:relative});return out;
}
const checks=[];
function check(name,condition,details){assert.ok(condition,name);checks.push({name,details});console.log('PASS '+name);}
const body=id=>({requestId:id,message:'Yesterday I go to work.',scenario:'Job interview',targetLanguage:'English'});
const req=input=>({json:async()=>input});
async function snapshot(userId){
  const result=await pg.query(`SELECT
    (SELECT coalesce(sum(jsonb_array_length(transcript)),0)::int FROM conversation_sessions WHERE user_id=$1) AS turns,
    (SELECT count(*)::int FROM mistake_patterns WHERE user_id=$1) AS mistakes,
    (SELECT coalesce(sum(occurrence_count),0)::int FROM user_mistake_stats WHERE user_id=$1) AS counted,
    (SELECT coalesce(max(current_streak),0)::int FROM user_streaks WHERE user_id=$1) AS streak`,[userId]);
  return result.rows[0];
}
(async()=>{
  const migrations=fs.readdirSync(root+'/backend/drizzle').filter(f=>/^\d+.*\.sql$/.test(f)).sort();
  const first=migrations.filter(f=>!f.startsWith('0011_'));
  for(const file of first)await pg.exec(fs.readFileSync(root+'/backend/drizzle/'+file,'utf8'));
  const legacyUser=crypto.randomUUID(),legacySession=crypto.randomUUID();
  await pg.query('INSERT INTO users (id,email,password_hash) VALUES ($1,$2,$3)',[legacyUser,'legacy@example.invalid','synthetic']);
  await pg.query('INSERT INTO conversation_sessions (id,user_id,scenario,target_language) VALUES ($1,$2,$3,$4)',[legacySession,legacyUser,'Legacy','English']);
  await pg.query('INSERT INTO mistake_patterns (user_id,session_id,category,original_text,corrected_text) VALUES ($1,$2,$3,$4,$5)',[legacyUser,legacySession,'tense_usage','go','went']);
  const added=migrations.filter(f=>f.startsWith('0011_'));assert.equal(added.length,1);
  await pg.exec(fs.readFileSync(root+'/backend/drizzle/'+added[0],'utf8'));
  const old=await pg.query('SELECT original_text,corrected_text,note FROM mistake_patterns WHERE user_id=$1',[legacyUser]);
  check('Additive migration preserves old corrections without fabricating explanations',old.rows[0].original_text==='go'&&old.rows[0].corrected_text==='went'&&old.rows[0].note===null);
  const schema=load('backend/src/lib/db/schema.ts');db=drizzle(pg,{schema});
  const userA=crypto.randomUUID(),userB=crypto.randomUUID();
  await db.insert(schema.users).values([{id:userA,email:'a@example.invalid',passwordHash:'synthetic'},{id:userB,email:'b@example.invalid',passwordHash:'synthetic'}]);
  const route=load('backend/src/app/api/conversations/route.ts');auth.userId=userA;
  await pg.exec(`CREATE FUNCTION fail_correction() RETURNS trigger AS $$ BEGIN
    IF current_setting('talkly.fail_correction',true)='on' THEN RAISE EXCEPTION 'Injected correction failure'; END IF;
    RETURN NEW; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER injected_failure BEFORE INSERT ON mistake_patterns FOR EACH ROW EXECUTE FUNCTION fail_correction();`);
  await pg.query("SELECT set_config('talkly.fail_correction','on',false)");
  const input=body(crypto.randomUUID());
  const failed=await route.POST(req(input));
  const partial=await snapshot(userA);
  check('Injected persistence failure rolls back transcript, corrections, counters and streak',failed.status===500&&Object.values(partial).every(v=>v===0),partial);
  const savedResult=await pg.query('SELECT result,response FROM conversation_turn_requests WHERE user_id=$1 AND request_id=$2',[userA,input.requestId]);
  check('AI result remains recoverable after the transaction fails',savedResult.rows[0].result!==null&&savedResult.rows[0].response===null&&aiCalls===1);
  await pg.query("SELECT set_config('talkly.fail_correction','off',false)");
  const retry=await route.POST(req(input));
  const committed=await snapshot(userA);
  check('Retry commits one answer pair with one correction and one streak',retry.status===200&&committed.turns===2&&committed.mistakes===1&&committed.counted===1&&committed.streak===1,committed);
  check('Retry reuses saved AI result and consumes no second quota',aiCalls===1&&quotaCalls===1,{aiCalls,quotaCalls});
  const duplicate=await route.POST(req(input));
  check('A lost success response is replayed without new writes or AI',duplicate.status===200&&JSON.stringify(duplicate.data)===JSON.stringify(retry.data)&&aiCalls===1&&(await snapshot(userA)).turns===2);
  const note=await db.select().from(schema.mistakePatterns).where(eq(schema.mistakePatterns.userId,userA));
  check('Native-language correction is persisted in the error record',note[0].note==='Gunakan bentuk lampau.');
  const detail=load('backend/src/app/api/conversations/[sessionId]/route.ts');
  const history=await detail.GET({}, {params:Promise.resolve({sessionId:retry.data.sessionId})});
  check('History returns the correction on its original answer',history.status===200&&history.data.session.transcript[0].mistakes[0].note==='Gunakan bentuk lampau.');
  const reused=await route.POST(req({...input,message:'A different answer'}));
  check('Changing content under the same request ID is rejected',reused.status===409&&reused.data.error==='request_id_reused'&&aiCalls===1);
  auth.userId=userB;
  const forbidden=await route.POST(req({...body(crypto.randomUUID()),sessionId:retry.data.sessionId}));
  check('Another account cannot write into the first account session',forbidden.status===404&&aiCalls===1);
  const separate=await route.POST(req(input));
  check('Same request ID is isolated by account',separate.status===200&&separate.data.sessionId!==retry.data.sessionId&&(await snapshot(userB)).turns===2);
  auth.userId=userA;
  const parallel=body(crypto.randomUUID()),before=aiCalls;
  const pair=await Promise.all([route.POST(req(parallel)),route.POST(req(parallel))]);
  check('Concurrent same-ID attempts make one simulated AI call',aiCalls===before+1&&pair.some(r=>r.status===200)&&pair.every(r=>[200,409].includes(r.status)),{statuses:pair.map(r=>r.status)});
  const requests=load('backend/src/lib/data/turn-requests.ts');
  const expiredId=crypto.randomUUID();
  const firstOwner=await requests.claimTurnRequest(userA,expiredId,'synthetic-hash',null);
  let busy=false;try{await requests.claimTurnRequest(userA,expiredId,'synthetic-hash',null);}catch(e){busy=e.code==='request_in_progress';}
  check('Active lease rejects competing attempts',busy);
  await pg.query("UPDATE conversation_turn_requests SET lease_expires_at=now()-interval '1 second' WHERE user_id=$1 AND request_id=$2",[userA,expiredId]);
  const newOwner=await requests.claimTurnRequest(userA,expiredId,'synthetic-hash',null);
  check('Expired lease can be recovered with a new owner',newOwner.leaseToken!==firstOwner.leaseToken);
  let staleRejected=false;try{await requests.prepareTurnResult(firstOwner,{message:'stale',expectedTurns:0,createdAt:new Date().toISOString(),response:{sessionId:legacySession,reply:'stale',mistakes:[]}});}catch(e){staleRejected=e.code==='request_in_progress';}
  check('Old lease owner cannot save a late result',staleRejected);
  const output={date:'2026-10-03',engine:'PGlite 0.5.8, temporary in-memory PostgreSQL',migrationsApplied:migrations,checks,scope:'Real route, SQL and migration execution. Synthetic accounts and AI; no Neon, provider, HTTP/browser or device verification. PGlite uses one connection.'};
  if (process.env.TALKLY_TEST_REPORT) fs.writeFileSync(process.env.TALKLY_TEST_REPORT,JSON.stringify(output,null,2));
  console.log(`${checks.length}/${checks.length} checks passed`);
  await pg.close();
})().catch(async e=>{console.error(e);await pg.close().catch(()=>{});process.exitCode=1;});
