// Actual routes, SDK and PostgreSQL. AI choices/checks are finite fixtures, not semantic proof.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root = process.env.TALKLY_REPO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dep = createRequire(root + '/backend/package.json'), ts = dep('typescript');
const {PGlite} = dep('@electric-sql/pglite'), {drizzle} = dep('drizzle-orm/pglite');
const {zodResponseFormat} = dep('openai/helpers/zod');
const sdkOnly = process.env.TALKLY_B3_SDK_ONLY === '1';
const sqlOnly = process.env.TALKLY_B3_SQL_ONLY === '1';
console.log('PHASE local ' + (sdkOnly ? 'SDK' : 'route/SQL') + ' contract startup');
// Installed PostgreSQL WASM declares a minimum 128MiB (2048 pages).
const pg = sdkOnly ? null : new PGlite({initialMemory:128*1024*1024}), modules = new Map(), checks = [], calls = [];
let db, userId, quotaCalls = 0, turnCalls = 0, reportCalls = 0, failAiOnce = false, reportFixture, turnFixture;
const mocks = {
  '@/lib/auth/require-auth': {getAuthFromRequest: () => userId ? {userId} : null},
  '@/lib/http/cors': {jsonCors: (data, options) => ({status: options?.status ?? 200, data}), corsPreflight: () => ({status: 204})},
  '@/lib/rate-limit': {consumeQuota: async () => {quotaCalls++; return {allowed: true};}},
  '@/lib/ai/openai': {openai: {chat: {completions: {parse: async input => {
    calls.push(structuredClone(input));
    if (input.response_format.json_schema.name === 'interview_report') {
      reportCalls++; return {choices: [{message: {parsed: structuredClone(reportFixture)}}]};
    }
    turnCalls++;
    if (failAiOnce) {failAiOnce = false; throw Error('Injected provider failure');}
    return {choices: [{message: {parsed: structuredClone(turnFixture)}}]};
  }}}}},
};
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const js = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
  const exports = {}; modules.set(relative, exports);
  vm.runInNewContext(js, {exports, console, Date, require(name) {
    if (name === '@/lib/db') return {db};
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) return load('backend/src/' + name.slice(2) + '.ts');
    if (name.startsWith('./')) return load(path.posix.join(path.posix.dirname(relative), name) + '.ts');
    if (['drizzle-orm', 'drizzle-orm/pg-core', 'zod', 'openai/helpers/zod', 'node:crypto'].includes(name)) return dep(name);
    throw Error('Unexpected dependency: ' + name);
  }}, {filename: relative});
  return exports;
}
function check(name, condition) { assert.ok(condition, name); checks.push({name}); console.log('PASS ' + name); }
const req = data => ({json: async () => data});
const post = input => load('backend/src/app/api/conversations/route.ts').POST(req(input));
const params = id => ({params: Promise.resolve({sessionId: id})});
const history = id => load('backend/src/app/api/conversations/[sessionId]/route.ts').GET({}, params(id));
const raw = async id => (await pg.query('SELECT * FROM conversation_sessions WHERE id=$1', [id])).rows[0];
const turnRequest = async id => (await pg.query('SELECT * FROM conversation_turn_requests WHERE user_id=$1 AND request_id=$2', [userId, id])).rows[0];
const revisionInput = (context, message) => ({requestId: crypto.randomUUID(), mode: 'answer_practice', practiceTarget: {sourceSessionId: context.sourceSessionId, targetId: context.targetId}, message});
const transferInput = (selection, message) => ({requestId: crypto.randomUUID(), mode: 'criterion_transfer', transferTarget: {sourceRevisionSessionId: selection.sourceRevisionSessionId, selectionId: selection.selectionId}, message});
const revisionFixture = (taskId, reason = 'Pertanyaan ini memberi kesempatan memakai kriteria yang sama.') => ({reply: 'Review your revision using the same criterion.', mistakes: [], taskSelection: {taskId, reason}});
const transferFixture = (status, evidenceQuote, explanation = 'Kutipan jawaban ini menjadi bukti untuk penilaian kriteria.') => ({reply: 'Review the evidence for this answer.', mistakes: [], criterionCheck: {status, evidenceQuote, explanation}});
const pastTarget = {fixIndex: 0, answerNumber: 1, dimension: 'grammar', evidenceQuote: 'I go', instruction: 'Gunakan bentuk lampau untuk menceritakan tindakan yang selesai.', successCriterion: 'Tindakan yang selesai ditulis dengan bentuk lampau yang tepat.'};
const politeTarget = {fixIndex: 0, answerNumber: 1, dimension: 'grammar', evidenceQuote: 'send me', instruction: 'Buat permintaan informasi dengan bentuk yang sopan.', successCriterion: 'Permintaan memakai bentuk sopan tanpa menjadi perintah kasar.'};
const contentTarget = {fixIndex: 0, answerNumber: 2, dimension: 'content', evidenceQuote: 'I helped my team.', instruction: 'Sebutkan tindakan nyata yang Anda sendiri lakukan.', successCriterion: 'Ada satu tindakan spesifik kandidat, bukan hanya tindakan tim.'};
// The report assembles upgrades from the source answer's own sentence + a gap, so this exact text is shown and excluded.
const modelExample = 'Yesterday I go to work. [add one task you finished]';
async function source(target, firstAnswer = 'Yesterday I go to work.', firstQuestion) {
  const id = crypto.randomUUID(), transcript = [{role: 'assistant', content: firstQuestion ?? load('backend/src/lib/ai/interview.ts').buildInterviewOpener('General')}];
  for (let n = 1; n <= 5; n++) {
    transcript.push({role: 'user', content: n === 1 ? firstAnswer : n === 2 ? 'I helped my team.' : 'Synthetic real experience ' + n});
    transcript.push({role: 'assistant', content: n === 5 ? 'Thank you.' : 'Stored source question ' + (n + 1) + '?'});
  }
  await pg.query('INSERT INTO conversation_sessions(id,user_id,scenario,target_language,mode,interview_role,transcript) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)', [id,userId,'Synthetic interview source','English','mock_interview','General',JSON.stringify(transcript)]);
  reportFixture = {score: 70, dimensions: Object.fromEntries(['grammar','structure','content','confidence'].map(key => [key,{score:70,comment:'Synthetic comment.'}])), strongestAnswer:{question:'Q5',why:'Relative selection.'}, weakestAnswer:{question:'Q1',why:'Relative selection.'}, topFixes:['Perbaikan terkait kriteria.'], answerUpgrades:[{answerNumber:1,parts:[{kind:'sentence',sentenceIndex:0,gapPrompt:null},{kind:'gap',sentenceIndex:null,gapPrompt:'one task you finished'}]}], practiceTarget:target};
  const result = await load('backend/src/app/api/interviews/[sessionId]/report/route.ts').POST({}, params(id));
  assert.equal(result.status,200); return {id, transcript, context:result.data.practiceContext};
}
async function sdkChecks() {
  const ai=load('backend/src/lib/ai/conversation.ts');
  const sdk=schema=>zodResponseFormat(schema,'b3_contract').json_schema;
  const base=sdk(ai.turnResultSchema),revision=sdk(ai.revisionTurnResultSchema),transfer=sdk(ai.transferTurnResultSchema);
  check('Actual SDK free/mock format does not force new selection/check fields',base.strict && !base.schema.required.includes('taskSelection') && !base.schema.required.includes('criterionCheck'));
  check('Actual SDK revision format requires a known-ID-or-null selection',revision.strict && revision.schema.required.includes('taskSelection') && JSON.stringify(revision.schema).includes('polite_request') && revision.schema.properties.taskSelection.properties.taskId.anyOf.some(item=>item.type==='null'));
  check('Actual SDK transfer format requires three statuses and nullable literal evidence',transfer.strict && transfer.schema.required.includes('criterionCheck') && JSON.stringify(transfer.schema.properties.criterionCheck.properties.status.enum)==='["observed","not_observed","not_assessable"]' && transfer.schema.properties.criterionCheck.properties.evidenceQuote.anyOf.some(item=>item.type==='null'));
  turnFixture={reply:'Hello.',mistakes:[]};
  await ai.runConversationTurn('Free practice','English',[],'Hello',[],'Indonesian',undefined,'synthetic-eval-model',0.1);
  check('Existing model/temperature argument positions and default response schema remain compatible',calls.at(-1).model==='synthetic-eval-model' && calls.at(-1).temperature===0.1 && !calls.at(-1).response_format.json_schema.schema.required.includes('taskSelection'));
}
async function main() {
  if (sdkOnly) { await sdkChecks(); saveOutput('Actual installed SDK schemas/function; simulated provider, no PostgreSQL or semantic fit proof.'); return; }
  console.log('PHASE temporary PostgreSQL migrations');
  for (const file of fs.readdirSync(root+'/backend/drizzle').filter(name=>/^\d+.*\.sql$/.test(name)).sort()) await pg.exec(fs.readFileSync(root+'/backend/drizzle/'+file,'utf8'));
  db = drizzle(pg,{schema:load('backend/src/lib/db/schema.ts')});
  const owner=crypto.randomUUID(),other=crypto.randomUUID(); userId=owner;
  await pg.query('INSERT INTO users(id,email,password_hash,native_language) VALUES($1,$2,$3,$4),($5,$6,$3,$4)',[owner,'b3-owner@example.invalid','synthetic','Indonesian',other,'b3-other@example.invalid']);
  const helper=load('backend/src/lib/practice/criterion-transfer.ts');
  if (!sqlOnly) await sdkChecks();
  console.log('PHASE actual route/SQL cases');

  const past=await source(pastTarget),polite=await source(politeTarget,'Please send me the information.'),content=await source(contentTarget);
  const original=JSON.stringify((await raw(past.id)).transcript),beforeRevisionCalls=turnCalls;
  turnFixture=revisionFixture('past_event'); const pastInput=revisionInput(past.context,'Yesterday I went to work.'),pastRevision=await post(pastInput),pastSelection=pastRevision.data.transferSelection;
  turnFixture=revisionFixture('polite_request'); const politeRevision=await post(revisionInput(polite.context,'Could you please send me the information?')),politeSelection=politeRevision.data.transferSelection;
  check('Same-dimension past/polite fixtures produce distinct persisted tasks in their existing calls',pastRevision.status===200 && politeRevision.status===200 && pastSelection.dimension===politeSelection.dimension && pastSelection.task.id==='past_event' && politeSelection.task.id==='polite_request' && turnCalls===beforeRevisionCalls+2);
  check('Revision prompt uses full criterion and distinct affordances rather than dimension-only matching',calls.at(-1).messages[0].content.includes(polite.context.successCriterion) && calls.at(-1).messages[0].content.includes('not merely the same broad dimension') && calls.at(-1).messages[0].content.includes('specific article rule or pronunciation') && calls.at(-1).messages[0].content.includes('Indonesian'));
  const request=await turnRequest(pastInput.requestId),pastRow=await raw(pastRevision.data.sessionId);
  check('Selection is identical in prepared response, committed cache and persisted assistant bubble',JSON.stringify(request.result.response.transferSelection)===JSON.stringify(pastSelection) && JSON.stringify(request.response.transferSelection)===JSON.stringify(pastSelection) && JSON.stringify(pastRow.transcript[2].transferSelection)===JSON.stringify(pastSelection));
  check('Selection freezes question/version/criterion and explicit original/revision/model exclusions',pastSelection.task.version==='guided-question-v1' && pastSelection.successCriterion===past.context.successCriterion && [past.context.originalAnswer,pastInput.message,modelExample].every(value=>pastSelection.excludedAnswers.includes(value)));
  check('B2 target ID/context and original interview remain unchanged',pastRevision.data.practiceContext.targetId===past.context.targetId && pastRevision.data.practiceContext.kind==='answer_revision' && JSON.stringify((await raw(past.id)).transcript)===original);
  const beforeRead=turnCalls,beforeReadQuota=quotaCalls; modules.clear(); const detail=await history(pastRevision.data.sessionId);
  check('Read-only detail after restart returns stored selection without AI or quota',detail.status===200 && detail.data.session.transcript[2].transferSelection.selectionId===pastSelection.selectionId && turnCalls===beforeRead && quotaCalls===beforeReadQuota);
  const replay=await post(pastInput);
  check('Lost revision response replays exact selection with no duplicate calls or turns',JSON.stringify(replay.data)===JSON.stringify(pastRevision.data) && turnCalls===beforeRead && quotaCalls===beforeReadQuota && (await raw(pastRevision.data.sessionId)).transcript.length===3);

  turnFixture=revisionFixture('past_event'); const laterMessage='Last week I prepared the checklist.';
  const later=await post({requestId:crypto.randomUUID(),sessionId:pastRevision.data.sessionId,message:laterMessage}),laterSelection=later.data.transferSelection;
  check('Later selection snapshots all earlier revision answers and has a distinct ID',laterSelection.selectionId!==pastSelection.selectionId && [pastInput.message,laterMessage].every(answer=>laterSelection.excludedAnswers.includes(answer)));
  check('An exact older selection reference resolves its own persisted bubble, not the latest',helper.findTaskSelection((await raw(pastRevision.data.sessionId)).transcript,pastRevision.data.sessionId,pastSelection.selectionId).revisionAnswer===pastInput.message);
  turnFixture=revisionFixture(null,'Kriteria ini belum memiliki pertanyaan baru yang sesuai.');
  const unsupported=await post({requestId:crypto.randomUUID(),sessionId:politeRevision.data.sessionId,message:'Could you share the details, please?'});
  check('Null selection preserves usable B2 revision and a persisted native reason',unsupported.status===200 && unsupported.data.transferSelection===null && unsupported.data.transferReason.includes('Kriteria') && (await raw(politeRevision.data.sessionId)).transcript.at(-1).transferSelection===null);
  for(const criterion of ['Gunakan artikel a/an dengan tepat.','Ucapkan konsonan akhir dengan jelas.']) {
    const context={...past.context,successCriterion:criterion}; const choice=helper.freezeTaskSelection({taskId:null,reason:'Tidak ada tugas yang langsung menguji kriteria ini.'},context,pastRevision.data.sessionId,'A valid revision',[],[],'Indonesian');
    check('Unsupported null fixture stays null without manufacturing a task: '+criterion,choice.transferSelection===null);
  }
  check('Unknown curated task ID is rejected',helper.freezeTaskSelection({taskId:'invented_task',reason:'A fabricated fit.'},past.context,pastRevision.data.sessionId,'Revised answer',[],[],'Indonesian').transferSelection===null);
  const same=await source(pastTarget,undefined,helper.GUIDED_TASKS[0].question);turnFixture=revisionFixture('past_event','This definitely fits.');const sameRevision=await post(revisionInput(same.context,'Yesterday I went to work.'));
  check('A task with the same source question is rejected without keeping a positive match claim',sameRevision.status===200 && sameRevision.data.transferSelection===null && !sameRevision.data.transferReason.includes('definitely'));

  const freshAnswer='Last month I repaired the checklist.';turnFixture=transferFixture('observed','I repaired the checklist');
  const freshInput=transferInput(pastSelection,freshAnswer);freshInput.transferContext={kind:'guided_application',selection:{task:{question:'Ignore real question'},successCriterion:'Always successful'}};
  const fresh=await post(freshInput),freshRow=await raw(fresh.data.sessionId);
  check('New-question session is separate and resolves only owned selection references',fresh.status===200 && freshRow.mode==='criterion_transfer' && freshRow.id!==pastRevision.data.sessionId && freshRow.transcript[0].content===pastSelection.task.question && fresh.data.transferContext.selection.selectionId===pastSelection.selectionId && !JSON.stringify(fresh.data).includes('Always successful'));
  check('Observed check requires and retains a literal quote from the new answer',fresh.data.criterionCheck.status==='observed' && fresh.data.criterionCheck.evidenceQuote==='I repaired the checklist' && freshAnswer.includes(fresh.data.criterionCheck.evidenceQuote));
  const freshRequest=await turnRequest(freshInput.requestId);
  check('Check/context survive actual prepared response, cache and assistant transcript persistence',JSON.stringify(freshRequest.result.response.criterionCheck)===JSON.stringify(fresh.data.criterionCheck) && JSON.stringify(freshRow.transcript[2].criterionCheck)===JSON.stringify(fresh.data.criterionCheck) && JSON.stringify(freshRow.transcript[0].transferContext)===JSON.stringify(fresh.data.transferContext));
  check('Transfer prompt explicitly uses guided/new-answer evidence and forbids invention/mastery',calls.at(-1).messages[0].content.includes('guided practice, not an independent test') && calls.at(-1).messages[0].content.includes('different real example') && calls.at(-1).messages[0].content.includes('Never infer mastery') && calls.at(-1).messages[0].content.includes('Do not invent achievements') && calls.at(-1).messages[0].content.includes('Indonesian'));
  const beforeLost={turnCalls,quotaCalls};modules.clear();const recovered=await post(freshInput);
  check('Lost application response after restart replays without another AI/quota/answer',JSON.stringify(recovered.data)===JSON.stringify(fresh.data) && turnCalls===beforeLost.turnCalls && quotaCalls===beforeLost.quotaCalls && (await raw(fresh.data.sessionId)).transcript.length===3);
  const retarget=await post({...transferInput(politeSelection,'Could you share the report?'),sessionId:fresh.data.sessionId});
  check('Frozen transfer session rejects retargeting before AI/quota',retarget.status===409 && retarget.data.error==='session_changed' && turnCalls===beforeLost.turnCalls && quotaCalls===beforeLost.quotaCalls);
  const reused=await post({...freshInput,transferTarget:{sourceRevisionSessionId:politeRevision.data.sessionId,selectionId:politeSelection.selectionId}});
  check('The same request ID with changed references is rejected',reused.status===409 && reused.data.error==='request_id_reused');
  const unknown=await post(transferInput({...pastSelection,selectionId:'0'.repeat(64)},'A valid new answer'));
  check('Unknown selection ID is rejected before quota/AI',unknown.status===400 && turnCalls===beforeLost.turnCalls && quotaCalls===beforeLost.quotaCalls);
  for(const malformed of [false,true]) {
    const id=crypto.randomUUID(),transcript=structuredClone(freshRow.transcript);
    if(malformed) transcript[0].transferContext.selection.successCriterion='Changed without a matching frozen hash';else delete transcript[0].transferContext;
    await pg.query('INSERT INTO conversation_sessions(id,user_id,scenario,target_language,mode,interview_role,transcript) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[id,owner,'Broken transfer metadata','English','criterion_transfer','General',JSON.stringify(transcript)]);
    const response=await post({...transferInput(politeSelection,'Different source'),sessionId:id});
    check('Nonempty transfer with '+(malformed?'malformed':'missing')+' context cannot reattach a source',response.status===400 && response.data.error==='invalid_transfer_context' && turnCalls===beforeLost.turnCalls && quotaCalls===beforeLost.quotaCalls && JSON.stringify((await raw(id)).transcript)===JSON.stringify(transcript));
  }
  userId=other;const foreign=await post(transferInput(pastSelection,'Foreign application'));
  check('Another account cannot resolve revision refs or read the application',foreign.status===404 && (await history(pastRevision.data.sessionId)).status===404 && (await history(fresh.data.sessionId)).status===404 && quotaCalls===beforeLost.quotaCalls);userId=owner;

  const frozen=fresh.data.transferContext;
  for(const [name,status,quote,expected,reason] of [
    ['observed missing quote','observed',null,'not_assessable','missing_quote'],
    ['observed wrong quote','observed','Not in answer','not_assessable','invalid_quote'],
    ['not-observed missing quote','not_observed',null,'not_observed',undefined],
    ['not-observed exact quote','not_observed','My team','not_observed',undefined],
    ['not-observed wrong quote','not_observed','Not in answer','not_assessable','invalid_quote'],
  ]) {
    const result=helper.validateCriterionCheck({status,evidenceQuote:quote,explanation:'Penjelasan simulasi.'},'My team did the work.',frozen,'Indonesian');
    check('Evidence boundary: '+name,result.status===expected && result.validationReason===reason);
  }
  for(const answer of ['', '   ', 'skip', "I don't know"]) check('No/avoided answer does not become observed: '+JSON.stringify(answer),helper.validateCriterionCheck({status:'observed',evidenceQuote:answer,explanation:'Unsafe success.'},answer,frozen,'Indonesian').status==='not_assessable');
  for(const copied of [past.context.originalAnswer,pastInput.message,laterMessage,modelExample]) {
    const answer=copied.toUpperCase().replace(/\s+/g,'  ');turnFixture={...transferFixture('observed',answer,'Ini membuktikan keberhasilan.'),reply:'You mastered this ability.'};
    const response=await post(transferInput(laterSelection,answer)),row=await raw(response.data.sessionId);
    check('Normalized copied original/revision/model text has neutral persisted feedback: '+copied,response.status===200 && response.data.criterionCheck.status==='not_assessable' && response.data.criterionCheck.validationReason==='copied_answer' && response.data.reply===helper.UNVERIFIED_REPLY && response.data.criterionCheck.explanation.includes('belum dapat dinilai') && row.transcript[2].content===helper.UNVERIFIED_REPLY && row.transcript[2].criterionCheck.validationReason==='copied_answer');
  }
  turnFixture=revisionFixture('own_action');const contentRevision=await post(revisionInput(content.context,'I reviewed the checklist myself.'));
  turnFixture=transferFixture('not_observed','The team handled everything.','Jawaban belum menjelaskan tindakan kandidat sendiri.');
  const weak=await post(transferInput(contentRevision.data.transferSelection,'The team handled everything.'));
  check('Correct-grammar but unmet content fixture stays not_observed independently of mistakes',weak.status===200 && weak.data.mistakes.length===0 && weak.data.criterionCheck.status==='not_observed');
  turnFixture={...transferFixture('observed','A fabricated quote','Berhasil.'),reply:'This proves mastery.'};const badEvidence=await post(transferInput(pastSelection,'Last month I prepared a file.'));
  check('Unverifiable quote overrides both positive raw reply and explanation before persistence',badEvidence.data.criterionCheck.status==='not_assessable' && badEvidence.data.criterionCheck.validationReason==='invalid_quote' && badEvidence.data.reply===helper.UNVERIFIED_REPLY && badEvidence.data.criterionCheck.explanation.includes('belum dapat dinilai'));

  const originalBankQuestion=helper.GUIDED_TASKS[0].question;helper.GUIDED_TASKS[0].question='A later bank question must not replace the frozen task.';
  await pg.query("UPDATE interview_reports SET report=jsonb_set(report,'{practiceTarget,successCriterion}',to_jsonb($1::text)) WHERE session_id=$2",['Changed source criterion',past.id]);
  turnFixture=transferFixture('observed','I updated');
  for(let i=0;i<11;i++) assert.equal((await post({requestId:crypto.randomUUID(),sessionId:fresh.data.sessionId,message:'Last week I updated a different file '+i+'.'})).status,200);
  check('Frozen question/criterion survive later bank/source edits and over twenty history bubbles',(await raw(fresh.data.sessionId)).transcript.length===25 && calls.at(-1).messages.length===22 && calls.at(-1).messages[0].content.includes(pastSelection.task.question) && calls.at(-1).messages[0].content.includes(pastSelection.successCriterion) && !calls.at(-1).messages[0].content.includes('Changed source criterion') && !calls.at(-1).messages[0].content.includes('A later bank question'));
  helper.GUIDED_TASKS[0].question=originalBankQuestion;
  check('Every application feedback turn retains its structured check',(await raw(fresh.data.sessionId)).transcript.filter(turn=>turn.role==='assistant').slice(1).every(turn=>turn.criterionCheck?.status==='observed'));
  const beforeProvider=turnCalls;turnFixture=transferFixture('observed','I checked');failAiOnce=true;const retryInput=transferInput(pastSelection,'Last month I checked the notes.'),failedProvider=await post(retryInput),emptyRequest=await turnRequest(retryInput.requestId);
  check('Initial provider failure leaves an attached empty transfer session recoverable',failedProvider.status===502 && (await raw(emptyRequest.session_id)).transcript.length===0);
  const retryProvider=await post(retryInput);
  check('Provider retry uses the same empty session and commits one canonical question/check',retryProvider.status===200 && retryProvider.data.sessionId===emptyRequest.session_id && (await raw(emptyRequest.session_id)).transcript.length===3 && turnCalls===beforeProvider+2);

  await pg.exec("CREATE FUNCTION fail_b3_correction() RETURNS trigger AS $$ BEGIN IF current_setting('talkly.fail_b3_correction',true)='on' THEN RAISE EXCEPTION 'Injected B3 correction failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql; CREATE TRIGGER fail_b3_correction BEFORE INSERT ON mistake_patterns FOR EACH ROW EXECUTE FUNCTION fail_b3_correction();");
  await pg.exec("SELECT set_config('talkly.fail_b3_correction','on',false)");
  const failureAnswer='Last month I repaired a file. My teammates was satisfied.';
  turnFixture={...transferFixture('observed','I repaired a file'),mistakes:[{category:'verb_conjugation',originalText:'teammates was',correctedText:'teammates were',note:'Subjek jamak memakai were.'}]};
  const durableInput=transferInput(pastSelection,failureAnswer),failed=await post(durableInput),pending=await turnRequest(durableInput.requestId);
  check('SQL failure rolls back question/context/check/answer while keeping the prepared frozen result',failed.status===500 && (await raw(pending.session_id)).transcript.length===0 && pending.result.transferContext.selection.selectionId===pastSelection.selectionId && pending.result.response.criterionCheck.status==='observed');
  const beforeDurable={turnCalls,quotaCalls};await pg.exec("SELECT set_config('talkly.fail_b3_correction','off',false)");
  await pg.query("UPDATE conversation_sessions SET transcript='[]'::jsonb WHERE id=$1",[pastRevision.data.sessionId]);modules.clear();
  const durable=await post(durableInput),durableRow=await raw(durable.data.sessionId);
  check('Prepared retry after source removal/restart preserves exact question/check without new AI/quota',durable.status===200 && turnCalls===beforeDurable.turnCalls && quotaCalls===beforeDurable.quotaCalls && durableRow.transcript.length===3 && durableRow.transcript[0].content===pastSelection.task.question && durableRow.transcript[2].criterionCheck.evidenceQuote==='I repaired a file');
  const corrections=(await pg.query('SELECT count(*)::int AS count FROM mistake_patterns WHERE session_id=$1',[durable.data.sessionId])).rows[0].count;
  check('Correction and statistics commit exactly once after recovery',corrections===1 && (await pg.query("SELECT occurrence_count FROM user_mistake_stats WHERE user_id=$1 AND category='verb_conjugation'",[owner])).rows[0].occurrence_count===1);
  const reopened=await history(durable.data.sessionId);
  check('Reopening history retains source/revision/new-task links and the new answer/evidence',reopened.status===200 && reopened.data.session.transcript[0].transferContext.selection.sourceRevisionSessionId===pastRevision.data.sessionId && reopened.data.session.transcript[0].transferContext.selection.sourceInterviewSessionId===past.id && reopened.data.session.transcript[1].content===failureAnswer && reopened.data.session.transcript[2].criterionCheck.status==='observed');
  turnFixture=transferFixture('observed','I reviewed');const frozenContinuation=await post({requestId:crypto.randomUUID(),sessionId:fresh.data.sessionId,message:'Last month I reviewed the tasks.'});
  check('An existing frozen application remains usable after its revision source changes',frozenContinuation.status===200 && frozenContinuation.data.transferContext.selection.selectionId===pastSelection.selectionId);
  const obsolete=await post(transferInput(pastSelection,'A new attempt from missing selection'));
  check('A new attempt cannot invent a removed source selection',obsolete.status===400);
  const legacyId=crypto.randomUUID();await pg.query('INSERT INTO conversation_sessions(id,user_id,scenario,target_language,mode,interview_role,transcript) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[legacyId,owner,'Older revision','English','answer_practice','General',JSON.stringify(pastRow.transcript.map(turn=>{const copy={...turn};delete copy.transferSelection;delete copy.transferReason;return copy;}))]);
  const legacyBefore={turnCalls,quotaCalls};const legacy=await history(legacyId);
  check('Legacy unselected revision is readable without generating a task',legacy.status===200 && !legacy.data.session.transcript.some(turn=>turn.transferSelection!==undefined) && turnCalls===legacyBefore.turnCalls && quotaCalls===legacyBefore.quotaCalls);
  const trajectory=load('backend/src/lib/trajectory/trajectory.ts').buildTrajectory([{score:30,createdAt:new Date('2026-10-01'),role:'General',rubricVersion:'practice-v1'},{score:95,createdAt:new Date('2026-10-02'),role:'General',rubricVersion:'practice-v1'}],[],new Date('2026-10-05'));
  check('A higher interview score remains raw history without task-equivalence/application proof',JSON.stringify(trajectory.scores.map(score=>score.score))==='[30,95]' && trajectory.comparison===null && trajectory.insight.includes('do not establish learning') && !trajectory.insight.includes('up 65'));
  userId=null;check('Application writes and source/history reads still require authentication',(await post(transferInput(pastSelection,'Hello'))).status===401 && (await history(fresh.data.sessionId)).status===401);
  saveOutput('Actual routes/SQL/SDK; temporary PostgreSQL and simulated AI/users. Task choices/check statuses are fixtures, not real-model semantic fit, language validity, mastery, device or human-benefit proof.');
}
function saveOutput(scope) {
  const sourceFiles=['backend/src/lib/ai/conversation.ts','backend/src/lib/practice/criterion-transfer.ts','backend/src/lib/validations/conversation.ts','backend/src/lib/data/turn-requests.ts','backend/src/app/api/conversations/route.ts','backend/src/lib/trajectory/trajectory.ts'];
  const output={runAt:new Date().toISOString(),scope,checks,passed:checks.length,sourceHashes:Object.fromEntries(sourceFiles.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),turnCalls,reportCalls,quotaCalls};
  if(process.env.TALKLY_TEST_REPORT) fs.writeFileSync(process.env.TALKLY_TEST_REPORT,JSON.stringify(output,null,2));
  console.log(`${checks.length}/${checks.length} checks passed. ${sdkOnly ? 'Actual SDK/function; simulated provider; no SQL or semantic proof.' : 'Actual routes/SQL/SDK; simulated choices/checks; no semantic/provider/device proof.'}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>pg?.close());
