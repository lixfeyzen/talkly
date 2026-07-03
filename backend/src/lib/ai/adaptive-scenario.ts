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
const SCENARIO_BY_CATEGORY: Record<MistakeCategory, string> = {
  verb_conjugation: "Tell a new colleague about your family's daily routine",
  tense_usage: "Talk about your last vacation, then your plans for the next one",
  gender_agreement: "Shop for clothes: describe colors, sizes, and materials",
  plural_agreement: "Order food & drinks for a big group at a restaurant",
  preposition_usage: "Explain the route from your home to a favorite place, step by step",
  article_usage: "Describe what's in your room and the things you want to buy",
  word_order: "Light debate: agree or disagree, give your opinion + reasons",
  vocabulary_choice: "Explain your favorite hobby in as much detail as you can",
  other: "Casual small talk about your week",
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
        ? `Your most frequent mistakes are ${LABELS[primary]} (${primaryCount}×) and ${LABELS[focusCategories[1]]} — this practice targets both.`
        : `Your most frequent mistake is ${LABELS[primary]} (${primaryCount}×) — this practice targets it.`,
  };
}
