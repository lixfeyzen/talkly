// Confidence signal detection — deterministic scoring dari teks user answers.
//																															┃
//																															Approach: word-level counting + density-based scoring + short-answer penalty
//																															┃
//																															┃

import type { ChatTurn } from './conversation';

// === Kumpulan sinyal (bisa di-extend nanti) ===

// Kata yang menandakan keraguan/hedging (bukan phrase, word-level)
const HEDGING_WORDS = new Set([
  'think', 'guess', 'suppose', 'assume', 'maybe', 'perhaps',
  'sort', 'kind', 'approximately', 'seems', 'probably',
  'might', 'could', 'would', 'should',
]);

// Phrase filler — di-count sebagai unit, bukan word-by-word
// "you know" = 1 filler, meski "you" dan "know" sendiri bukan filler murni
const FILLER_PHRASES = [
  'you know', 'i mean', 'sort of', 'kind of', 'sorta', 'kinda',
];

// Kata filler murni (bukan pronoun/verb yang ambigu)
const FILLER_WORDS = new Set([
  'um', 'uh', 'well', 'like', 'actually', 'basically', 'literally',
]);

// Kata/frase yang menunjukkan kepemilikan/kepercayaan diri (assertive)
const ASSERTIVE_WORDS = new Set([
  'delivered', 'led', 'achieved', 'owned', 'negotiated',
  'built', 'solved', 'increased', 'reduced', 'stepped',
  'confident', 'certain', 'definitely', 'absolutely',
  'clearly', 'obviously', 'certainly', 'undoubtedly',
  'decided', 'drove', 'took', 'approach', 'result',
  'success', 'impact', 'growth', 'improved', 'managed',
  'created', 'developed', 'implemented', 'launched',
]);

// === Fungsi helper ===

/** Strip trailing punctuation dari kata sebelum match (agar "Maybe." match "maybe") */
function stripPunctuation(word: string): string {
  return word.replace(/[.!?,;:'"()\[\]{}]+$/, '');
}

/** Cari kata-phrase di teks menggunakan word boundary regex */
function countPhrase(text: string, phrase: string): number {
  const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export interface ConfidenceSignals {
  hedgingCount: number;
  fillerCount: number;
  assertiveCount: number;
  shortAnswerCount: number; // jawaban < 5 kata
  totalWords: number;
  hedgingDensity: number;    // hedging per 100 kata
  fillerDensity: number;    // filler per 100 kata
  assertiveDensity: number;  // assertive per 100 kata
  shortAnswerDensity: number; // short answers per total jawaban * 100
}

export function detectConfidenceSignals(transcript: ChatTurn[]): ConfidenceSignals {
  const userAnswers = transcript.filter(t => t.role === 'user');
  const allText = userAnswers.map(a => a.content).join(' ');
  const lower = allText.toLowerCase();

  // 1. Filler phrase-level (sebelum tokenization)
  let fillerCount = 0;
  for (const phrase of FILLER_PHRASES) {
    fillerCount += countPhrase(lower, phrase);
  }

  // 2. Tokenize setelah phrase diganti placeholder (agar nggak dihitung 2x)
  let processed = lower;
  for (const phrase of FILLER_PHRASES) {
    processed = processed.replace(new RegExp(`\\b${phrase}\\b`, 'g'), '__PH__');
  }

  // 3. Split ke words dan strip punctuation
  const rawWords = processed.split(/\s+/).filter(w => w.length > 0 && w !== '__PH__');
  const words = rawWords.map(stripPunctuation);
  const totalWords = words.length;

  // 4. Word-level counting (setelah punctuation stripped)
  let hedgingCount = 0;
  let assertiveCount = 0;
  let wordFillerCount = 0;

  for (const word of words) {
    if (HEDGING_WORDS.has(word)) hedgingCount++;
    if (ASSERTIVE_WORDS.has(word)) assertiveCount++;
    if (FILLER_WORDS.has(word)) wordFillerCount++;
  }

  // Total filler = phrase filler + word filler
  fillerCount += wordFillerCount;

  // 5. Short answer detection (<5 kata)
  let shortAnswerCount = 0;
  for (const answer of userAnswers) {
    const wordCount = answer.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 0 && wordCount < 5) shortAnswerCount++;
  }
  const shortAnswerDensity = userAnswers.length > 0
    ? (shortAnswerCount / userAnswers.length) * 100
    : 0;

  // Density per 100 words
  const hedgingDensity = totalWords > 0 ? (hedgingCount / totalWords) * 100 : 0;
  const fillerDensity = totalWords > 0 ? (fillerCount / totalWords) * 100 : 0;
  const assertiveDensity = totalWords > 0 ? (assertiveCount / totalWords) * 100 : 0;

  return {
    hedgingCount,
    fillerCount,
    assertiveCount,
    shortAnswerCount,
    totalWords,
    hedgingDensity,
    fillerDensity,
    assertiveDensity,
    shortAnswerDensity,
  };
}

// === Fungsi scoring (density-based + short answer penalty) ===

/**
 * Skor 0-100 berdasarkan density sinyal.
 * Base 50, adjust berdasarkan density relative.
 *
 * Formula:
 *   score = 50
 *   - hedgingDensity * 0.5    (0.5 poin per 1% density)
 *   - fillerDensity * 0.3     (0.3 poin per 1% density)
 *   - shortAnswerDensity * 0.4 (0.4 poin per 1% density)
 *   + assertiveDensity * 0.8  (0.8 poin per 1% density)
 *
 * Contoh:
 *   - 10% kata adalah hedging → -5 poin
 *   - 5% kata adalah filler → -1.5 poin
 *   - 100% jawaban pendek → -40 poin
 *   - 8% kata adalah assertive → +6.4 poin
 */
export function calculateConfidenceScore(signals: ConfidenceSignals): number {
  if (signals.totalWords === 0) return 50; // netral kalau tidak ada data

  let score = 50;

  // Penalize hedging (0.5 poin per 1% density)
  score -= signals.hedgingDensity * 0.5;

  // Penalize filler (0.3 poin per 1% density)
  score -= signals.fillerDensity * 0.3;

  // Penalize short answers (0.4 poin per 1% density)
  score -= signals.shortAnswerDensity * 0.4;

  // Reward assertive (0.8 poin per 1% density)
  score += signals.assertiveDensity * 0.8;

  // Clamp ke 0-100
  return Math.max(0, Math.min(100, score));
}
