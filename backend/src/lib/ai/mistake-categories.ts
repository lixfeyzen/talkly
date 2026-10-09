// Kategori kesalahan bahasa yang dikenali sistem -- dipakai AI buat
// klasifikasi terstruktur (bukan teks bebas) supaya bisa diagregasi jadi
// statistik & dipakai milih skenario adaptif berikutnya.
export const MISTAKE_CATEGORIES = [
  "verb_conjugation",
  "tense_usage",
  "gender_agreement",
  "plural_agreement",
  "preposition_usage",
  "article_usage",
  "word_order",
  "vocabulary_choice",
  "other",
] as const;

export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

// Shared by the free-chat and interview prompts so both detect with the same rules.
// Live test v3 (2026-10-09): all 4 false corrections came from the interview prompt, which lacked these.
export const MISTAKE_DETECTION_RULE = `Also catch word-order errors, especially misplaced adverbs (e.g. "She speaks very well French" should be "She speaks French very well"). Each mistakes entry must describe exactly ONE error with ONE category -- if a single phrase contains several errors, report them as SEPARATE entries, each with its own correct category (e.g. "They has many client" contains TWO separate mistakes: verb_conjugation "has" -> "have" AND plural_agreement "client" -> "clients"). Report every error you are CERTAIN is wrong English; when in doubt, leave it out -- a false correction is worse than a missed one. If there are no certain mistakes, return an empty mistakes array -- do NOT invent mistakes that are not there.`;

export function mistakeCategoryRules(targetLanguage: string, categories: readonly string[] = MISTAKE_CATEGORIES): string {
  return [
    `The mistake category MUST be one of: ${categories.join(", ")}. Pick the MOST SPECIFIC category: plural_agreement covers singular/plural noun errors (e.g. "five year" -> "five years") including uncountable nouns, which never take "many" or plural -s (e.g. "many feedbacks" -> "a lot of feedback"); vocabulary_choice covers wrong word choice including wrong adverbs (e.g. "I much enjoy" -> "I really enjoy"); tense_usage covers wrong or missing tense, including a missing auxiliary for perfect tenses (e.g. "He finish the task already" -> "He has already finished the task"); preposition_usage covers wrong, EXTRA, or missing prepositions (an extra "about" or "of" after a verb is preposition_usage); verb_conjugation covers verbs that do not match their subject (e.g. "the teams meets weekly" -> "the teams meet weekly"); word_order is ONLY for words standing in the wrong position -- if the fix removes or replaces a word instead of moving it, it is NOT word_order; use "other" ONLY when nothing else fits.`,
    `Every "correctedText" must be natural, correct ${targetLanguage}; choose a fragment that isolates the one reported error.`,
  ].join(" ");
}
