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
  // A fragment that occurs twice cannot be placed on screen (live gate v4b: "was" -> "were").
  const once = (originalText, message) => filterGroundedCorrections([{category:'verb_conjugation', originalText, correctedText:'were', note:'n', severity:'grammar_error'}], message).length === 1;
  assert.equal(once('was', 'The store was busy and two colleagues was sick.'), false);
  assert.equal(once('colleagues was', 'The store was busy and two colleagues was sick.'), true);
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
test('Answer upgrades that add unstated content are detected; honest rewrites pass', () => {
  const {addsUnstatedContent} = load('backend/src/lib/ai/interview-report.ts', {'@/lib/ai/openai':{openai:{}}, 'openai/helpers/zod':{zodResponseFormat:() => ({})}});
  const answers = ["I did an internship at a bank for six month, where I helped the team prepare weekly reports.",
    "You should hire me because I learn fast, I am honest about what I don't know yet, and I always finish my work on time."];
  // Real app output, 2026-10-10: invented experience the candidate never stated.
  assert.equal(addsUnstatedContent("I learn fast, as shown when I quickly mastered new software tools during my internship, and I consistently met deadlines at the bank.", answers), true);
  assert.equal(addsUnstatedContent("I helped the team prepare 20 weekly reports at Google.", answers), true);
  // Grammar fixes, reordering, facts from another answer and [placeholders] are allowed.
  assert.equal(addsUnstatedContent("You should hire me because I learn fast and I always finish my work on time. During my internship at a bank, I helped the team prepare weekly reports [add one deadline you met].", answers), false);
  assert.equal(addsUnstatedContent("I did an internship at a bank for six months.", answers), false);
});
test('Answer upgrades are assembled only from the candidate sentences, checked corrections and gap prompts', () => {
  const {assembleAnswerUpgrades} = load('backend/src/lib/ai/interview-report.ts', {'@/lib/ai/openai':{openai:{}}, 'openai/helpers/zod':{zodResponseFormat:() => ({})}});
  const transcript = [
    {role:'assistant', content:'Tell me about yourself.'},
    {role:'user', content:'I did an internship at a bank for six month. I helped the team prepare weekly reports.', mistakes:[{category:'plural_agreement', originalText:'six month', correctedText:'six months', note:''}]},
    {role:'assistant', content:'Why should we hire you?'},
    {role:'user', content:'I learn fast. I always finish my work on time.'},
  ];
  const s = sentenceIndex => ({kind:'sentence', sentenceIndex, gapPrompt:null}), gap = gapPrompt => ({kind:'gap', sentenceIndex:null, gapPrompt});
  const out = assembleAnswerUpgrades([
    {answerNumber:2, parts:[s(1), s(0), gap('one real example of a deadline you met')]},
    {answerNumber:1, parts:[s(0), s(1)]},
  ], transcript);
  assert.equal(JSON.stringify(out), JSON.stringify([
    {question:'Why should we hire you?', original:'I learn fast. I always finish my work on time.', upgraded:'I always finish my work on time. I learn fast. [add one real example of a deadline you met]', answerNumber:2},
    {question:'Tell me about yourself.', original:transcript[1].content, upgraded:'I did an internship at a bank for six months. I helped the team prepare weekly reports.', answerNumber:1},
  ]));
  const dropped = parts => assembleAnswerUpgrades([{answerNumber:2, parts}], transcript).length === 0;
  assert.ok(dropped([s(5), gap('the result')]), 'invalid sentence index');
  assert.ok(dropped([s(0), gap('[the result]')]), 'bracket inside a gap prompt');
  assert.ok(dropped([s(0), gap('a'), gap('b'), gap('c'), gap('d')]), 'more than three gaps');
  assert.ok(dropped([s(0), s(1)]), 'no change from the original answer');
  assert.ok(dropped([s(0)]), 'dropping a sentence without a gap, reorder or correction');
  assert.ok(dropped([gap('the result')]), 'no candidate sentence');
  assert.equal(assembleAnswerUpgrades([{answerNumber:9, parts:[s(0)]}], transcript).length, 0);
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
