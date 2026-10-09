// Test confidence.ts — deterministic scoring tanpa butuh AI/API key.
// Jalankan: npx tsx scripts/test-confidence-helper.mts
// API: detectConfidenceSignals kembali {hedgingCount, fillerCount, assertiveCount, shortAnswerCount, totalWords, hedgingDensity, fillerDensity, assertiveDensity, shortAnswerDensity}
//      calculateConfidenceScore menggunakan density-based scoring + short answer penalty

import { detectConfidenceSignals, calculateConfidenceScore } from '../src/lib/ai/confidence';

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}`);
  if (condition) pass++; else fail++;
}

type Turn = { role: 'user' | 'assistant'; content: string };

// ——— Test 1: Empty transcript ———
const empty = detectConfidenceSignals([]);
check('Empty: totalWords = 0', empty.totalWords === 0);
check('Empty: hedgingDensity = 0', empty.hedgingDensity === 0);
check('Empty: fillerDensity = 0', empty.fillerDensity === 0);
check('Empty: assertiveDensity = 0', empty.assertiveDensity === 0);
check('Empty: shortAnswerDensity = 0', empty.shortAnswerDensity === 0);
check('Empty: score = 50 (netral)', calculateConfidenceScore(empty) === 50);

// ——— Test 2: Heavy hedging ———
const hedgingOnly: Turn[] = [
  { role: 'user', content: 'I think maybe I could have done better' },
  { role: 'user', content: 'I guess perhaps I am not sure' },
];
const hedgingSig = detectConfidenceSignals(hedgingOnly);
check('Hedging: hedgingDensity > 0', hedgingSig.hedgingDensity > 0);
check('Hedging: score < 50', calculateConfidenceScore(hedgingSig) < 50);

// ——— Test 3: Strong assertive ———
const assertiveOnly: Turn[] = [
  { role: 'user', content: 'I delivered the project on time and increased revenue by 30%' },
  { role: 'user', content: 'I led this initiative and the result was clear' },
  { role: 'user', content: 'I built the solution from scratch and solved the problem' },
];
const assertiveSig = detectConfidenceSignals(assertiveOnly);
check('Assertive: assertiveDensity > 0', assertiveSig.assertiveDensity > 0);
check('Assertive: score > 50', calculateConfidenceScore(assertiveSig) > 50);

// ——— Test 4: Short answers (defensive) ———
const shortAnswers: Turn[] = [
  { role: 'user', content: 'Yes.' },
  { role: 'user', content: "I don't know." },
  { role: 'user', content: 'Maybe.' },
];
const shortSig = detectConfidenceSignals(shortAnswers);
check('Short: totalWords > 0', shortSig.totalWords > 0);
// 3 jawaban pendek → shortAnswerDensity = (3/3)*100 = 100. Score: 50 - 0.5*(0/3) - 0.3*(0/3) - 0.4*(100) + 0.8*(1/3) = 50 - 40 + 0.27 = 10.27
check('Short: score < 50', calculateConfidenceScore(shortSig) < 50);
check('Short: shortAnswerDensity = 100', shortSig.shortAnswerDensity === 100);

// ——— Test 5: Balanced transcript ———
const balanced: Turn[] = [
  { role: 'user', content: 'I think maybe we could try something different' },
  { role: 'user', content: 'I led this project and delivered on time' },
  { role: 'user', content: 'I am not sure about the details but I tried my best' },
];
const balancedSig = detectConfidenceSignals(balanced);
const balancedScore = calculateConfidenceScore(balancedSig);
check('Balanced: hedgingDensity > 0', balancedSig.hedgingDensity > 0);
check('Balanced: assertiveDensity > 0', balancedSig.assertiveDensity > 0);
check('Balanced: score 30-70', balancedScore >= 30 && balancedScore < 70);

// ——— Test 6: Score clamping ———
const extremeHedge = {
  hedgingCount: 20, fillerCount: 10, assertiveCount: 0, shortAnswerCount: 0, totalWords: 40,
  hedgingDensity: 50, fillerDensity: 25, assertiveDensity: 0, shortAnswerDensity: 0,
};
const score1 = calculateConfidenceScore(extremeHedge);
check('Extreme hedge (50%): score >= 0', score1 >= 0);
check('Extreme hedge (50%): score < 50', score1 < 50);

const extremeAssertive = {
  hedgingCount: 0, fillerCount: 0, assertiveCount: 20, shortAnswerCount: 0, totalWords: 40,
  hedgingDensity: 0, fillerDensity: 0, assertiveDensity: 50, shortAnswerDensity: 0,
};
const score2 = calculateConfidenceScore(extremeAssertive);
check('Extreme assertive (50%): score <= 100', score2 <= 100);
check('Extreme assertive (50%): score > 50', score2 > 50);

// ——— Test 7: No signals → netral ———
const noSignals: Turn[] = [
  { role: 'user', content: 'The project was completed on schedule.' },
  { role: 'user', content: 'We followed the standard process.' },
];
const noSig = detectConfidenceSignals(noSignals);
check('No signals: hedgingDensity = 0', noSig.hedgingDensity === 0);
check('No signals: assertiveDensity = 0', noSig.assertiveDensity === 0);
check('No signals: shortAnswerDensity = 0', noSig.shortAnswerDensity === 0);
check('No signals: score = 50', calculateConfidenceScore(noSig) === 50);

// ——— Test 8: Mixed transcript (AI + user) ———
const mixed: Turn[] = [
  { role: 'assistant', content: 'Tell me about yourself.' },
  { role: 'user', content: 'I think maybe I am not sure what to say.' },
  { role: 'assistant', content: 'What is your biggest achievement?' },
  { role: 'user', content: 'I led a team of 10 people and delivered the project on time.' },
];
const mixedSig = detectConfidenceSignals(mixed);
check('Mixed: totalWords = 23 (user answers only)', mixedSig.totalWords === 23);
check('Mixed: hedgingDensity > 0', mixedSig.hedgingDensity > 0);
check('Mixed: assertiveDensity > 0', mixedSig.assertiveDensity > 0);

console.log('\n\nRINGKASAN: ' + pass + ' lulus, ' + fail + ' gagal');
if (fail > 0) process.exit(1);
console.log('Semua test confidence helper LULUS!');
