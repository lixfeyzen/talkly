// Actual report functions/routes and temporary PostgreSQL; synthetic users and AI output.
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
let db, userId, prompt;
const modules = new Map();
const syntheticReport = {
  score: 99,
  dimensions: {
    grammar: {score: 80, comment: 'Synthetic grammar feedback'},
    structure: {score: 70, comment: 'Synthetic structure feedback'},
    content: {score: 60, comment: 'Synthetic content feedback'},
    confidence: {score: 90, comment: 'Synthetic wording feedback'},
  },
  strongestAnswer: {question: 'Q1', why: 'Synthetic'},
  weakestAnswer: {question: 'Q2', why: 'Synthetic'},
  topFixes: ['Describe your actual contribution.'],
  answerUpgrades: [{answerNumber: 2, parts: [{kind: 'sentence', sentenceIndex: 0, gapPrompt: null}, {kind: 'gap', sentenceIndex: null, gapPrompt: 'the result'}]}],
};
const mocks = {
  '@/lib/auth/require-auth': {getAuthFromRequest: () => userId ? {userId} : null},
  '@/lib/http/cors': {jsonCors: (data, options) => ({status: options?.status ?? 200, data}), corsPreflight: () => ({status: 204})},
  '@/lib/ai/openai': {openai: {chat: {completions: {parse: async input => {
    prompt = input.messages[0].content;
    return {choices: [{message: {parsed: syntheticReport}}]};
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
    if (['drizzle-orm','drizzle-orm/pg-core','zod','openai/helpers/zod','node:crypto'].includes(name)) return dep(name);
    throw Error('Unexpected dependency: ' + name);
  }}, {filename: relative});
  return exports;
}
const checks = [];
function check(name, predicate, detail) {
  assert.ok(predicate, name); checks.push({name, detail}); console.log('PASS ' + name);
}
const now = new Date();
const daysAgo = days => new Date(now.getTime() - days * 86_400_000);
const meta = {role: 'General', rubricVersion: 'practice-v1'};
async function addReport(schema, owner, role, score, days, rubricVersion = 'practice-v1') {
  const id = crypto.randomUUID();
  await db.insert(schema.conversationSessions).values({id, userId: owner, scenario: 'Synthetic interview', targetLanguage: 'English', mode: 'mock_interview', interviewRole: role});
  const createdAt = daysAgo(days);
  await db.insert(schema.interviewReports).values({userId: owner, sessionId: id, score, report: rubricVersion ? {rubricVersion} : {}, createdAt});
  return {id, createdAt};
}
async function main() {
  for (const filename of fs.readdirSync(root + '/backend/drizzle').filter(f => /^\d+.*\.sql$/.test(f)).sort()) {
    await pg.exec(fs.readFileSync(root + '/backend/drizzle/' + filename, 'utf8'));
  }
  const schema = load('backend/src/lib/db/schema.ts'); db = drizzle(pg, {schema});
  const generated = await load('backend/src/lib/ai/interview-report.ts').generateInterviewReport('General', [{role: 'user', content: 'I helped the team finish a project.'}], 'Indonesian');
  check('Report stores a scoring version and role with a consistent mean score', generated.rubricVersion === 'practice-v1' && generated.interviewRole === 'General' && generated.score === 75, {score: generated.score});
  check('Configured prompt limits assessment to text and prohibits invented achievements', prompt.includes('not validated interview readiness') && prompt.includes('Never invent') && prompt.includes('Appropriate uncertainty') && prompt.includes('Indonesian'), 'Configuration only; simulated AI cannot prove real model compliance.');
  const {buildTrajectory} = load('backend/src/lib/trajectory/trajectory.ts');
  const mixed = buildTrajectory([
    {...meta, score: 45, createdAt: daysAgo(9)},
    {...meta, role: 'Sales', score: 98, createdAt: daysAgo(6)},
    {...meta, rubricVersion: 'older', score: 5, createdAt: daysAgo(5)},
    {...meta, score: 70, createdAt: daysAgo(1)},
  ], [], now);
  check('Score history keeps every raw report without asserting task equivalence or gain', JSON.stringify(mixed.scores.map(s => s.score)) === '[45,98,5,70]' && mixed.comparison === null && !mixed.insight.includes('up 25 points') && mixed.insight.includes('do not establish learning'));
  const legacy = buildTrajectory([{score: 40, createdAt: daysAgo(8)}, {score: 80, createdAt: daysAgo(2)}], [], now);
  check('Unversioned reports retain all raw scores without a misleading delta', legacy.scores.length === 2 && legacy.scores[1].score === 80 && legacy.comparison === null && !legacy.insight.includes('up 40'));
  const inactive = buildTrajectory([], [{category: 'tense_usage', createdAt: daysAgo(20)}], now);
  check('No recent corrections does not become a claim of improved ability', inactive.trends[0].recentCount === 0 && inactive.insight.includes('cannot establish improvement') && !inactive.insight.includes('100%'));
  const boundaries = buildTrajectory([], [
    {category: 'tense_usage', createdAt: daysAgo(14)},
    {category: 'tense_usage', createdAt: daysAgo(28)},
    {category: 'tense_usage', createdAt: daysAgo(28.01)},
    {category: 'tense_usage', createdAt: daysAgo(-1)},
  ], now);
  check('Correction windows count boundary dates once and ignore old/future rows', boundaries.trends[0].recentCount === 1 && boundaries.trends[0].previousCount === 1);
  const owner = crypto.randomUUID(), other = crypto.randomUUID();
  await db.insert(schema.users).values([{id: owner, email: 'learning-owner@example.invalid', passwordHash: 'synthetic'}, {id: other, email: 'learning-other@example.invalid', passwordHash: 'synthetic'}]);
  const comparable = await addReport(schema, owner, 'General', 45, 9);
  await addReport(schema, owner, 'Sales', 98, 6);
  await addReport(schema, owner, 'General', 5, 5, 'older');
  const otherReport = await addReport(schema, other, 'General', 100, 2);
  const current = await addReport(schema, owner, 'General', 70, 1);
  const reports = load('backend/src/lib/data/interview-reports.ts');
  check('Previous-score SQL ignores other roles, versions and users', await reports.getPreviousScore(owner, current.createdAt, current.id) === 45);
  check('Previous-score SQL cannot reveal another account history', await reports.getPreviousScore(other, current.createdAt, current.id) === null);
  const archived = await addReport(schema, owner, 'General', 77, 0.5, null);
  check('Archived report is preserved and has no invented comparison', (await reports.getReportForSession(owner, archived.id)).score === 77 && await reports.getPreviousScore(owner, archived.createdAt, archived.id) === null);
  const latest = await addReport(schema, owner, 'General', 76, 0.1);
  const corrections = [
    ...Array.from({length: 8}, () => ({userId: owner, sessionId: comparable.id, category: 'article_usage', createdAt: daysAgo(60)})),
    ...Array.from({length: 2}, () => ({userId: owner, sessionId: current.id, category: 'tense_usage', createdAt: daysAgo(2)})),
    {userId: owner, sessionId: current.id, category: 'word_order', createdAt: daysAgo(5)},
    ...Array.from({length: 5}, () => ({userId: other, sessionId: otherReport.id, category: 'preposition_usage', createdAt: daysAgo(1)})),
    {userId: owner, sessionId: latest.id, category: 'other', createdAt: daysAgo(-1)},
  ].map(row => ({...row, originalText: 'synthetic input', correctedText: 'synthetic correction'}));
  await db.insert(schema.mistakePatterns).values(corrections);
  userId = owner;
  const suggestion = await load('backend/src/app/api/scenarios/suggested/route.ts').GET({});
  check('Suggested practice uses recent corrections rather than lifetime totals', suggestion.status === 200 && JSON.stringify(suggestion.data.suggestion.focusCategories) === '["tense_usage","word_order"]');
  check('Suggestion explains its recent evidence rather than claiming mastery', suggestion.data.suggestion.reason.includes('recent recorded'));
  const trajectory = await load('backend/src/app/api/trajectory/route.ts').GET({});
  check('Trajectory route returns raw owner reports and current correction counts without learning comparison', trajectory.status === 200 && JSON.stringify(trajectory.data.scores.map(s => s.score)) === '[45,98,5,70,77,76]' && trajectory.data.trends.length === 2 && trajectory.data.comparison === null && trajectory.data.insight.includes('do not establish learning'));
  const blank = crypto.randomUUID();
  await db.insert(schema.users).values({id: blank, email: 'learning-blank@example.invalid', passwordHash: 'synthetic'});
  userId = blank;
  check('No recent evidence produces no fabricated focused suggestion', (await load('backend/src/app/api/scenarios/suggested/route.ts').GET({})).data.suggestion === null);
  userId = undefined;
  check('History and suggestion still require an authenticated user', (await load('backend/src/app/api/scenarios/suggested/route.ts').GET({})).status === 401 && (await load('backend/src/app/api/trajectory/route.ts').GET({})).status === 401);
  const output = {date: '2026-10-03', checks, scope: 'Actual functions, route handlers and PostgreSQL queries with synthetic accounts. AI output and authentication simulated. No real provider, Neon, browser or Android evidence.'};
  if (process.env.TALKLY_TEST_REPORT) fs.writeFileSync(process.env.TALKLY_TEST_REPORT, JSON.stringify(output, null, 2));
  console.log(`${checks.length}/${checks.length} checks passed. Synthetic data; temporary PostgreSQL; simulated AI.`);
}
main().catch(e => {console.error(e); process.exitCode = 1;}).finally(() => pg.close());
