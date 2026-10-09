// Real local functions, synthetic inputs and mocked external/native services. No paid calls.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as zod from 'zod';
const root = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function load(relative, mocks = {}, globals = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true} }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, console, ...globals, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'zod') return zod;
    if (name === 'node:crypto') return crypto;
    if (name.startsWith('@/')) return load('backend/src/' + name.slice(2) + '.ts', mocks, globals);
    throw Error('Unexpected external import: ' + name);
  }}, {filename: relative});
  return exports;
}
const cases = [];
function test(name, run) { cases.push({name, run}); }
const sessionId = '64b0e437-12c5-4209-a7ac-3986db150349';
function handler({allowed = true, authenticated = true} = {}) {
  const calls = {quota: 0, ai: 0, created: 0, appended: 0};
  let prepared;
  const route = load('backend/src/app/api/conversations/route.ts', {
    '@/lib/auth/require-auth': {getAuthFromRequest: () => authenticated ? {userId:'synthetic-user'} : null},
    '@/lib/ai/conversation': {runConversationTurn: async () => { calls.ai++; return {reply:'Synthetic answer', mistakes:[]}; }},
    '@/lib/ai/correction-check': {finalizeInterviewCorrections: async () => { throw Error('Interview correction check was not expected'); }},
    '@/lib/data/conversations': {
      createSession: async () => { calls.created++; return {id:sessionId}; },
      getSessionForUser: async () => null,
      listSessionsForUser: async () => [],
      appendTurns: async () => { calls.appended++; },
      recordMistakes: async () => {},
    },
    '@/lib/data/turn-requests': {
      readTurnRequest: async () => null,
      claimTurnRequest: async () => ({}), releaseTurnRequest: async () => {},
      ensureTurnSession: async () => { calls.created++; return sessionId; },
      prepareTurnResult: async (_, value) => { prepared=value; },
      completeTurnRequest: async () => { calls.appended++; return prepared.response; },
      TurnConflict: class extends Error {},
    },
    'drizzle-orm': {eq:() => null},
    '@/lib/db': {db:{select:() => ({from:() => ({where:() => ({limit:async () => [{nativeLanguage:'Indonesian'}]})})})}},
    '@/lib/db/schema': {users:{}},
    '@/lib/http/cors': {jsonCors:(data, options) => ({status:options?.status ?? 200, data}), corsPreflight:() => ({status:204})},
    '@/lib/rate-limit': {consumeQuota:async () => {calls.quota++; return {allowed, retryAfterSec:30};}},
  });
  return {route, calls};
}
const request = data => ({json:async () => data});
const newSession = {message:'Yesterday I led a project.', scenario:'Job interview', targetLanguage:'English'};
test('POST with exhausted quota does not call AI or create a session', async () => {
  const {route,calls} = handler({allowed:false});
  const result = await route.POST(request(newSession));
  assert.equal(result.status,429); assert.equal(calls.quota,1); assert.equal(calls.ai,0); assert.equal(calls.created,0);
});
test('GET history remains available without using the AI quota', async () => {
  const {route,calls} = handler({allowed:false});
  assert.equal((await route.GET({})).status,200); assert.equal(calls.quota,0); assert.equal(calls.ai,0);
});
test('Allowed POST uses quota and stores one answer pair', async () => {
  const {route,calls} = handler();
  assert.equal((await route.POST(request(newSession))).status,200);
  assert.equal(calls.quota,1); assert.equal(calls.ai,1); assert.equal(calls.appended,1);
});
test('Invalid input is rejected before quota and AI', async () => {
  const {route,calls} = handler();
  assert.equal((await route.POST(request({...newSession,message:''}))).status,400);
  assert.equal(calls.quota,0); assert.equal(calls.ai,0);
});
test('Unauthenticated reads and writes are rejected', async () => {
  const {route,calls} = handler({authenticated:false});
  assert.equal((await route.GET({})).status,401);
  assert.equal((await route.POST(request(newSession))).status,401);
  assert.equal(calls.quota,0); assert.equal(calls.ai,0);
});
test('All six roles have five stable, nonempty questions over 1,000 synthetic IDs', () => {
  const interview = load('backend/src/lib/ai/interview.ts');
  for (const role of interview.INTERVIEW_ROLES) {
    for (let i=0;i<1000;i++) {
      const hex = crypto.createHash('sha256').update('talkly-audit-' + i).digest('hex');
      const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
      const questions = interview.getInterviewQuestions(role,id);
      assert.equal(questions.length,5);
      assert.ok(questions.every(q => typeof q === 'string' && q.length > 0), `${role}, ${id}`);
      assert.notEqual(questions[1], questions[2]);
      assert.equal(JSON.stringify(questions), JSON.stringify(interview.getInterviewQuestions(role,id)));
    }
  }
});
test('Correction filter drops hyphen-only and an->a vowel-sound edits, keeps real fixes', () => {
  const {filterGroundedCorrections} = load('backend/src/lib/ai/feedback-guidance.ts');
  const kept = (originalText, correctedText, severity = 'grammar_error') =>
    filterGroundedCorrections([{category:'other', originalText, correctedText, note:'n', severity}], originalText).length === 1;
  // Live v3 false corrections must be dropped.
  assert.equal(kept('my class-project work', 'my class project work'), false);
  assert.equal(kept('an unfamiliar project step', 'a unfamiliar project step'), false);
  assert.equal(kept('An idea', 'A idea'), false);
  assert.equal(kept('worked hard', 'worked very hard', 'style_preference'), false);
  // Genuine corrections must survive.
  assert.equal(kept('Yesterday I go', 'Yesterday I went'), true);
  assert.equal(kept('an university', 'a university'), true);
  assert.equal(kept('an one-time fee', 'a one-time fee'), true);
  assert.equal(kept('an European client', 'a European client'), true);
  assert.equal(kept('a apple', 'an apple'), true);
  assert.equal(kept('an unfamiliar steps', 'an unfamiliar step'), true);
});
test('Correction check keeps only fully passing proposals; omitted or conflicting indexes are rejected', async () => {
  let sent;
  const checks = [
    {index:0, reason:'r', originalIsWrong:true, correctionIsRight:true, noteIsRight:true},
    {index:1, reason:'r', originalIsWrong:true, correctionIsRight:true, noteIsRight:false},
    {index:3, reason:'r', originalIsWrong:true, correctionIsRight:true, noteIsRight:true},
    {index:3, reason:'r', originalIsWrong:false, correctionIsRight:true, noteIsRight:true},
  ];
  const openai = {chat:{completions:{parse: async body => { sent = body; return {choices:[{message:{parsed:{checks}}}]}; }}}};
  const {checkCorrections} = load('backend/src/lib/ai/correction-check.ts', {'@/lib/ai/openai':{openai}, 'openai/helpers/zod':{zodResponseFormat:() => ({})}});
  const m = id => ({originalText:'o'+id, correctedText:'c'+id, note:'n'+id});
  const kept = await checkCorrections('q', 'a', [m(0), m(1), m(2), m(3)], 'Indonesian');
  assert.deepEqual(kept.map(k => k.originalText), ['o0']);
  assert.equal(sent.temperature, 0);
  assert.ok(sent.messages[0].content.includes('written in Indonesian'));
  assert.deepEqual(await checkCorrections('q', 'a', [], null), []);
});
test('Interview corrections drop the AI note and fail closed when the check errors', async () => {
  const deps = parse => ({'@/lib/ai/openai':{openai:{chat:{completions:{parse}}}}, 'openai/helpers/zod':{zodResponseFormat:() => ({})}});
  const pass = async () => ({choices:[{message:{parsed:{checks:[{index:0, reason:'r', originalIsWrong:true, correctionIsRight:true, noteIsRight:true}]}}}]});
  const m = {category:'tense_usage', originalText:'I go', correctedText:'I went', note:'Gunakan bentuk lampau.'};
  const ok = load('backend/src/lib/ai/correction-check.ts', deps(pass));
  assert.equal(JSON.stringify(await ok.finalizeInterviewCorrections('q', 'Yesterday I go', [m], 'Indonesian')), JSON.stringify([{...m, note:''}]));
  const broken = load('backend/src/lib/ai/correction-check.ts', deps(async () => { throw Error('provider down'); }));
  assert.equal((await broken.finalizeInterviewCorrections('q', 'Yesterday I go', [m], 'Indonesian')).length, 0);
});
function evaluateReport(confidence, version = confidence ? "practice-v1" : undefined) {
  const payload = {score:70,previousScore:null,report:{rubricVersion:version,score:70,dimensions:{grammar:{score:70,comment:''},structure:{score:70,comment:''},content:{score:70,comment:''},...(confidence ? {confidence:{score:65,comment:'Synthetic wording feedback'}} : {})},strongestAnswer:{question:'Q',why:'W'},weakestAnswer:{question:'Q',why:'W'},topFixes:['F'],answerUpgrades:[]}};
  let index=0;
  const token = new Proxy({}, {get:() => 8});
  const component = load('src/app/interview-report.tsx', {
    react:{useEffect:() => {},useState:() => [[payload,false,null][index++],() => {}]},
    'react/jsx-runtime':{jsx:(type,props) => ({type,props}),jsxs:(type,props) => ({type,props})},
    'react-native':{StyleSheet:{create:x => x},ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',Pressable:'Pressable',View:'View',Text:'Text'},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    'expo-router':{router:{},useLocalSearchParams:() => ({sessionId})},
    '@expo/vector-icons':{Feather:'Feather'},
    '@/components/gradient-background':{GradientBackground:'GradientBackground'},
    '@/components/ui':{PrimaryButton:'PrimaryButton',SectionLabel:'SectionLabel'},
    '@/constants/theme':{Spacing:token,MaxContentWidth:480,Ink:'#000',Pastel:token,HairlineBorder:token,HeroBg:'#000'},
    '@/lib/interviews/api':{generateReport:() => {}},
    '@/lib/conversations/api':{fetchSuggestedScenario:async() => null},
    '@/lib/api/client':{ApiError:Error,NetworkError:Error},
  }, {__DEV__:false});
  return JSON.stringify(component.default());
}
test('Legacy three-dimension report evaluates without inventing a fourth score', () => {
  const tree = evaluateReport(false);
  assert.ok(tree.includes('Grammar')); assert.ok(!tree.includes('Answer wording'));
});
test('Current report retains wording feedback and states its scope', () => {
  const tree = evaluateReport(true);
  assert.ok(tree.includes('Answer wording')); assert.ok(tree.includes('does not measure'));
  assert.ok(!tree.includes('Interview ready')); assert.ok(!tree.includes('Kompetitor'));
});
test('Legacy four-dimension report is labelled as archived rather than reinterpreted', () => {
  const tree = evaluateReport(true, 'legacy');
  assert.ok(tree.includes('Legacy confidence score'));
  assert.ok(tree.includes('older scoring instructions'));
  assert.ok(!tree.includes('Answer wording'));
});
(async () => {
  let failed=0;
  for (const {name,run} of cases) {
    try { await run(); console.log('PASS ' + name); }
    catch(e) { failed++; console.error('FAIL ' + name + ': ' + e.message); }
  }
  console.log(`${cases.length-failed}/${cases.length} passed. Real functions; synthetic data, mocked services and native runtime. No live/device proof.`);
  if (failed) process.exitCode=1;
})();
