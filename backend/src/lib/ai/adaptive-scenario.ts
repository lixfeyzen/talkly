import type { MistakeCategory } from "@/lib/ai/mistake-categories";

// Skenario adaptif (fitur #3): pilih latihan berikutnya yang SENGAJA memaksa
// user memakai pola yang masih lemah, berdasarkan agregat user_mistake_stats.
// Fungsi murni (tanpa DB/AI) supaya gampang dites.

export type WeaknessStat = { category: string; occurrenceCount: number };

export type SuggestedScenario = {
  scenario: string;
  focusCategories: MistakeCategory[];
  reason: string;
};

// Tiap kategori kesalahan dipetakan ke skenario yang secara alami memaksa
// pola itu sering muncul (mis. cerita kemarin-vs-besok memaksa ganti tense).
// Konteks skenario mengikuti target market: interview kerja & percakapan
// kantor. Tiap skenario tetap MEMAKSA pola grammar kategorinya muncul sering.
const SCENARIO_BY_CATEGORY: Record<MistakeCategory, string> = {
  verb_conjugation: "Describe your team's daily routine to a new colleague",
  tense_usage: "Interview question: walk through your last project, then your plans for your next role",
  gender_agreement: "Describe your company, its products, and the people you work with",
  plural_agreement: "Describe your responsibilities across multiple teams and projects",
  preposition_usage: "Explain a project timeline: deadlines, handoffs, and who reports to whom",
  article_usage: "Describe your role, the company you work for, and the tools you use",
  word_order: "Interview question: describe a challenge you faced, with your opinion and reasons",
  vocabulary_choice: "Explain your proudest project in as much detail as you can",
  other: "Small talk with a colleague about your week",
};

const LABELS: Record<MistakeCategory, string> = {
  verb_conjugation: "verb conjugation",
  tense_usage: "tense usage",
  gender_agreement: "gender agreement",
  plural_agreement: "plural agreement",
  preposition_usage: "prepositions",
  article_usage: "articles",
  word_order: "word order",
  vocabulary_choice: "vocabulary choice",
  other: "other patterns",
};

function isKnownCategory(category: string): category is MistakeCategory {
  return category in SCENARIO_BY_CATEGORY;
}

// Label ramah-manusia utk kategori; kategori tak dikenal balik apa adanya.
// Dipakai juga oleh trajectory (kalimat insight).
export function categoryLabel(category: string): string {
  return isKnownCategory(category) ? LABELS[category] : category;
}

// stats boleh dalam urutan apa pun; yang dipakai = 1-2 kategori dengan
// occurrenceCount tertinggi. Return null kalau belum ada data (user baru)
// -- pemanggil yang menentukan fallback-nya.
export function suggestScenario(stats: WeaknessStat[]): SuggestedScenario | null {
  const known = stats
    .filter((s) => isKnownCategory(s.category) && s.occurrenceCount > 0)
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  if (known.length === 0) return null;

  const focusCategories = known.slice(0, 2).map((s) => s.category as MistakeCategory);
  const primary = focusCategories[0];
  const primaryCount = known[0].occurrenceCount;

  return {
    scenario: SCENARIO_BY_CATEGORY[primary],
    focusCategories,
    reason:
      focusCategories.length === 2
        ? `Your most frequent mistakes are ${LABELS[primary]} (${primaryCount}×) and ${LABELS[focusCategories[1]]}. This practice targets both.`
        : `Your most frequent mistake is ${LABELS[primary]} (${primaryCount}×). This practice targets it.`,
  };
}
