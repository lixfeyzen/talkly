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
