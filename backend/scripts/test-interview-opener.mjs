// Actual routes, durable SQL and report serializer; temporary PostgreSQL and simulated AI.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root = process.env.TALKLY_REPO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dep = createRequire(root + '/backend/package.json');
const ts = dep('typescript');
const {PGlite} = dep('@electric-sql/pglite');
const {drizzle} = dep('drizzle-orm/pglite');
const pg = new PGlite();
const modules = new Map();
let db, userId, aiCalls = 0, quotaCalls = 0, reportCalls = 0, checkCalls = 0, capturedCheck = null, failAiOnce = false;
let aiBarrier, aiEntered, capturedReport;
const aiInputs = [];
const reportFixture = {
  score: 70,
  dimensions: Object.fromEntries(['grammar', 'structure', 'content', 'confidence'].map(k => [k, {score: 70, comment: 'Synthetic feedback.'}])),
  strongestAnswer: {question: 'Tell me about yourself and your background.', why: 'Synthetic.'},
  weakestAnswer: {question: 'Synthetic question 2?', why: 'Synthetic.'},
  topFixes: ['Explain your own contribution.'],
  answerUpgrades: [{answerNumber: 1, parts: [{kind: 'sentence', sentenceIndex: 0, gapPrompt: null}, {kind: 'gap', sentenceIndex: null, gapPrompt: 'the result'}]}],
};
const mistakes = [{category: 'tense_usage', originalText: 'I go', correctedText: 'I went', note: 'Gunakan bentuk lampau.'}];
const mocks = {
  '@/lib/auth/require-auth': {getAuthFromRequest: () => userId ? {userId} : null},
  '@/lib/http/cors': {jsonCors: (data, options) => ({status: options?.status ?? 200, data}), corsPreflight: () => ({status: 204})},
  '@/lib/rate-limit': {consumeQuota: async () => {quotaCalls++; return {allowed: true};}},
  '@/lib/api/client': {apiFetch: () => {throw Error('Frontend API call was not expected');}, AI_TIMEOUT_MS: 45_000},
  '@/lib/ai/conversation': {runConversationTurn: async (...args) => {
    aiCalls++; aiInputs.push(structuredClone(args));
    aiEntered?.();
    if (aiBarrier) await aiBarrier;
    if (failAiOnce) {failAiOnce = false; throw Error('Synthetic provider failure');}
    const answers = args[2].filter(t => t.role === 'user').length + 1;
    return {reply: answers < 5 ? `Recorded. Synthetic question ${answers + 1}?` : 'Thank you. The interview is finished.', mistakes};
  }},
  '@/lib/ai/openai': {openai: {chat: {completions: {parse: async input => {
    if (input.response_format?.json_schema?.name === 'correction_check') {
      checkCalls++; capturedCheck = JSON.parse(input.messages[1].content);
      return {choices: [{message: {parsed: {checks: capturedCheck.proposals.map(p => ({index: p.index, reason: 'synthetic', originalIsWrong: true, correctionIsRight: true, noteIsRight: true}))}}}]};
    }
    reportCalls++; capturedReport = structuredClone(input.messages);
    return {choices: [{message: {parsed: structuredClone(reportFixture)}}]};
  }}}}},
};
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
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
const checks = [];
function check(name, condition, detail) {
  assert.ok(condition, name); checks.push({name, detail}); console.log('PASS ' + name);
}
const req = data => ({json: async () => data});
const interviewInput = (role = 'General') => ({requestId: crypto.randomUUID(), mode: 'mock_interview', interviewRole: role, targetLanguage: 'English', message: 'Yesterday I go to work.'});
const post = input => load('backend/src/app/api/conversations/route.ts').POST(req(input));
const detail = id => load('backend/src/app/api/conversations/[sessionId]/route.ts').GET({}, {params: Promise.resolve({sessionId: id})});
const report = id => load('backend/src/app/api/interviews/[sessionId]/report/route.ts').POST({}, {params: Promise.resolve({sessionId: id})});
async function session(id) {
  return (await pg.query('SELECT transcript, mode, interview_role FROM conversation_sessions WHERE id=$1', [id])).rows[0];
}
async function counts(owner) {
  return (await pg.query(`SELECT
    (SELECT coalesce(sum(jsonb_array_length(transcript)),0)::int FROM conversation_sessions WHERE user_id=$1) AS turns,
    (SELECT count(*)::int FROM mistake_patterns WHERE user_id=$1) AS corrections,
    (SELECT coalesce(sum(occurrence_count),0)::int FROM user_mistake_stats WHERE user_id=$1) AS counted,
    (SELECT coalesce(max(current_streak),0)::int FROM user_streaks WHERE user_id=$1) AS streak`, [owner])).rows[0];
}
async function newUser(label) {
  const id = crypto.randomUUID();
  await pg.query('INSERT INTO users (id,email,password_hash,native_language) VALUES ($1,$2,$3,$4)', [id, label + '@example.invalid', 'synthetic', 'Indonesian']);
  userId = id; return id;
}
async function emptySession(role = 'General') {
  const id = crypto.randomUUID();
  await pg.query('INSERT INTO conversation_sessions (id,user_id,scenario,target_language,mode,interview_role) VALUES ($1,$2,$3,$4,$5,$6)', [id, userId, 'Synthetic interview', 'English', 'mock_interview', role]);
  return id;
}
async function main() {
  const migrationFiles = fs.readdirSync(root + '/backend/drizzle').filter(f => /^\d+.*\.sql$/.test(f)).sort();
  for (const filename of migrationFiles) await pg.exec(fs.readFileSync(root + '/backend/drizzle/' + filename, 'utf8'));
  const schema = load('backend/src/lib/db/schema.ts'); db = drizzle(pg, {schema});
  const interview = load('backend/src/lib/ai/interview.ts');
  const client = load('src/lib/interviews/api.ts');
  let fullSession;
  for (const role of interview.INTERVIEW_ROLES) {
    await newUser('opener-' + role.toLowerCase().replaceAll(' ', '-'));
    const opener = client.buildInterviewOpener(role);
    check(role + ': frontend and backend reproduce the full displayed opener', opener === interview.buildInterviewOpener(role) && opener.endsWith(client.INTERVIEW_OPENER) && opener.includes(role) && opener.includes('5 questions'));
    const input = interviewInput(role), before = aiCalls;
    const response = await post(input);
    const stored = await session(response.data.sessionId);
    check(role + ': first completion persists exact opener, answer and reply once', response.status === 200 && stored.transcript.length === 3 && JSON.stringify(stored.transcript.map(t => t.role)) === '["assistant","user","assistant"]' && stored.transcript[0].content === opener && stored.transcript[1].content === input.message && stored.transcript[2].content === response.data.reply && aiCalls === before + 1);
    check(role + ': first AI input includes the displayed opener and Q1 progress remains answer-based', aiInputs.at(-1)[2].length === 1 && aiInputs.at(-1)[2][0].content === opener && response.data.interview.questionNumber === 2 && response.data.interview.finished === false);
    const prepared = (await pg.query('SELECT result FROM conversation_turn_requests WHERE user_id=$1 AND request_id=$2', [userId, input.requestId])).rows[0].result;
    check(role + ': saved first result keeps the original preappend length zero', prepared.expectedTurns === 0 && prepared.openingMessage === opener);
    const quotaBefore = quotaCalls;
    modules.clear(); // Reload current route modules without losing PostgreSQL state.
    const recovered = await post(input);
    check(role + ': response replay after module restart makes no new opener, AI or quota', recovered.status === 200 && (await session(response.data.sessionId)).transcript.length === 3 && aiCalls === before + 1 && quotaCalls === quotaBefore);
    if (role === 'General') fullSession = {id: response.data.sessionId, owner: userId, opener};
  }
  userId = fullSession.owner;
  for (let answer = 2; answer <= 5; answer++) {
    const response = await post({requestId: crypto.randomUUID(), sessionId: fullSession.id, message: 'Synthetic answer ' + answer});
    check('Answer ' + answer + ': progress uses user answers, not assistant bubbles', response.status === 200 && response.data.interview.questionNumber === Math.min(answer + 1, 5) && response.data.interview.finished === (answer === 5));
    if (answer === 4) check('A report after four answers is rejected even with nine transcript bubbles', (await report(fullSession.id)).data.error === 'interview_not_finished' && reportCalls === 0);
  }
  const completed = await session(fullSession.id);
  check('Five-answer interview has eleven bubbles and only one exact opener', completed.transcript.length === 11 && completed.transcript.filter(t => t.role === 'user').length === 5 && completed.transcript.filter(t => t.content === fullSession.opener).length === 1 && interview.isInterviewFinished(completed.transcript));
  const history = await detail(fullSession.id);
  check('History exposes the opener and keeps the checked correction, without the AI note, on its original user answer', history.status === 200 && history.data.session.transcript[0].content === fullSession.opener && history.data.session.transcript[1].mistakes[0].originalText === mistakes[0].originalText && history.data.session.transcript[1].mistakes[0].note === '');
  check('Interview corrections pass the second check with the answered question and the answer', checkCalls > 0 && capturedCheck.answer === 'Synthetic answer 5' && capturedCheck.question.startsWith('Recorded. Synthetic question 5'));
  const generated = await report(fullSession.id);
  const expectedPayload = 'Here is the full interview transcript:\n\n' + completed.transcript.map(t => `${t.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.content}`).join('\n') + '\n\nNumbered candidate sentences for answerUpgrades (use only these indices):\n' + completed.transcript.filter(t => t.role === 'user').map((t, n) => `Answer ${n + 1}: ` + t.content.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).map((s, i) => `[${i}] ${s}`).join(' ')).join('\n');
  check('Actual report route/serializer receives every question and answer in stored order', generated.status === 200 && capturedReport[1].content === expectedPayload && capturedReport[1].content.startsWith('Here is the full interview transcript:\n\nINTERVIEWER: ' + fullSession.opener));
  const reportQuota = quotaCalls;
  check('Saved report replay makes no extra report generation or quota call', (await report(fullSession.id)).status === 200 && reportCalls === 1 && quotaCalls === reportQuota);
  const finalReplay = await post({requestId: crypto.randomUUID(), sessionId: fullSession.id, message: 'Sixth answer'});
  check('Sixth answer remains rejected after the opener is persisted', finalReplay.status === 409 && finalReplay.data.error === 'interview_finished' && (await session(fullSession.id)).transcript.length === 11);

  const failedOwner = await newUser('opener-rollback');
  await pg.exec(`CREATE FUNCTION fail_opener_correction() RETURNS trigger AS $$ BEGIN
    IF current_setting('talkly.fail_opener_correction',true)='on' THEN RAISE EXCEPTION 'Injected correction failure'; END IF;
    RETURN NEW; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER injected_opener_failure BEFORE INSERT ON mistake_patterns FOR EACH ROW EXECUTE FUNCTION fail_opener_correction();`);
  await pg.query("SELECT set_config('talkly.fail_opener_correction','on',false)");
  const failedInput = interviewInput(), beforeFailure = aiCalls, beforeFailureQuota = quotaCalls;
  const failed = await post(failedInput);
  const saved = (await pg.query('SELECT result,response,session_id FROM conversation_turn_requests WHERE user_id=$1 AND request_id=$2', [userId, failedInput.requestId])).rows[0];
  check('Correction-write failure rolls back opener, answer, corrections, stats and streak together', failed.status === 500 && Object.values(await counts(failedOwner)).every(value => value === 0));
  check('Failed completion retains its exact opener in the durable AI result', saved.response === null && saved.result.expectedTurns === 0 && saved.result.openingMessage === fullSession.opener);
  await pg.query("SELECT set_config('talkly.fail_opener_correction','off',false)");
  modules.clear();
  const retry = await post(failedInput);
  const restored = await counts(failedOwner);
  check('Retry after restart commits opener once using saved result without new AI/quota', retry.status === 200 && restored.turns === 3 && restored.corrections === 1 && restored.counted === 1 && restored.streak === 1 && aiCalls === beforeFailure + 1 && quotaCalls === beforeFailureQuota + 1);

  await newUser('opener-ai-retry');
  failAiOnce = true;
  const aiFailure = interviewInput('Sales');
  check('First provider failure leaves the empty interview transcript untouched', (await post(aiFailure)).status === 502 && (await counts(userId)).turns === 0);
  const attached = (await pg.query('SELECT session_id FROM conversation_turn_requests WHERE user_id=$1 AND request_id=$2', [userId, aiFailure.requestId])).rows[0].session_id;
  const aiRetry = await post(aiFailure);
  check('Retry after provider failure uses the attached session and saves one full opener', aiRetry.status === 200 && aiRetry.data.sessionId === attached && (await session(attached)).transcript.length === 3 && (await session(attached)).transcript[0].content === client.buildInterviewOpener('Sales'));

  await newUser('opener-parallel-id');
  let release, entered;
  aiBarrier = new Promise(resolve => {release = resolve;});
  const enteredPromise = new Promise(resolve => {entered = resolve;});
  aiEntered = entered;
  const concurrentInput = interviewInput('Marketing'), beforeConcurrent = aiCalls;
  const firstPost = post(concurrentInput);
  await enteredPromise;
  const competing = await post(concurrentInput);
  release(); const first = await firstPost; aiBarrier = undefined; aiEntered = undefined;
  check('Overlapping same-ID sends consume one AI call and commit one opener', first.status === 200 && competing.status === 409 && competing.data.error === 'request_in_progress' && aiCalls === beforeConcurrent + 1 && (await session(first.data.sessionId)).transcript.length === 3);

  await newUser('opener-parallel-session');
  const empty = await emptySession('Designer');
  let releaseBoth, enteredBoth, arrivals = 0;
  aiBarrier = new Promise(resolve => {releaseBoth = resolve;});
  const bothEntered = new Promise(resolve => {enteredBoth = resolve;});
  aiEntered = () => {if (++arrivals === 2) enteredBoth();};
  const inputs = [1, 2].map(i => ({requestId: crypto.randomUUID(), sessionId: empty, message: 'Competing answer ' + i}));
  const pending = inputs.map(post); await bothEntered; releaseBoth();
  const pair = await Promise.all(pending); aiBarrier = undefined; aiEntered = undefined;
  check('Different simultaneous first answers cannot append two openers to one session', pair.filter(r => r.status === 200).length === 1 && pair.some(r => r.status === 409 && r.data.error === 'session_changed') && (await session(empty)).transcript.length === 3 && (await counts(userId)).corrections === 1, {statuses: pair.map(r => r.status)});

  await newUser('opener-legacy-pending');
  const requests = load('backend/src/lib/data/turn-requests.ts');
  const pendingId = crypto.randomUUID();
  const oldRequest = await requests.claimTurnRequest(userId, pendingId, 'legacy-payload', null);
  const oldSession = await requests.ensureTurnSession(oldRequest, {scenario: 'Old pending interview', targetLanguage: 'English', focusCategories: [], mode: 'mock_interview', interviewRole: 'General'});
  await requests.prepareTurnResult(oldRequest, {message: 'Legacy pending answer', expectedTurns: 0, createdAt: new Date().toISOString(), response: {sessionId: oldSession, reply: 'Legacy next question?', mistakes: []}});
  await requests.completeTurnRequest(userId, pendingId);
  check('Old durable first result without opener remains recoverable without inventing history', (await session(oldSession)).transcript.length === 2 && (await session(oldSession)).transcript[0].role === 'user');
  const oldTranscript = (await session(oldSession)).transcript;
  await post({requestId: crypto.randomUUID(), sessionId: oldSession, message: 'Legacy second answer'});
  const oldContinued = (await session(oldSession)).transcript;
  check('Nonempty legacy transcript keeps its original prefix and receives no fabricated opener', oldContinued.length === 4 && JSON.stringify(oldContinued.slice(0, 2)) === JSON.stringify(oldTranscript) && oldContinued.every(t => t.content !== fullSession.opener));

  await newUser('opener-free');
  const free = await post({requestId: crypto.randomUUID(), scenario: 'Client meeting', targetLanguage: 'English', message: 'I go'});
  check('Free conversation keeps its original two-turn shape with no interview opener', free.status === 200 && (await session(free.data.sessionId)).transcript.length === 2 && (await session(free.data.sessionId)).transcript[0].role === 'user' && !free.data.interview);
  const sources = ['backend/src/lib/ai/interview.ts', 'backend/src/lib/data/turn-requests.ts', 'backend/src/app/api/conversations/route.ts', 'src/lib/interviews/api.ts', 'src/app/conversation.tsx'];
  const sourceHashes = Object.fromEntries(sources.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  const output = {runAt: new Date().toISOString(), checks, sourceHashes, simulatedAiCalls: aiCalls, simulatedReportCalls: reportCalls, simulatedCheckCalls: checkCalls, engine: 'Temporary in-memory PGlite/PostgreSQL, single connection', scope: 'Actual route handlers, durable SQL, history and report serializer. Synthetic users, authentication and AI. No provider, Neon, HTTP/browser, Android or human-benefit proof. Old pending results deliberately retain legacy shape.'};
  if (process.env.TALKLY_TEST_REPORT) fs.writeFileSync(process.env.TALKLY_TEST_REPORT, JSON.stringify(output, null, 2));
  console.log(`${checks.length}/${checks.length} checks passed. Actual routes/SQL; simulated AI and temporary PostgreSQL.`);
}
main().catch(e => {console.error(e); process.exitCode = 1;}).finally(() => pg.close());
