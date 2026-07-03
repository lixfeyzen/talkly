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
  verb_conjugation: "Ceritakan rutinitas harian keluargamu ke teman baru",
  tense_usage: "Ceritakan liburan terakhirmu, lalu rencana liburan berikutnya",
  gender_agreement: "Belanja pakaian di toko: deskripsikan warna, ukuran, dan bahan barang",
  plural_agreement: "Pesan makanan & minuman untuk rombongan besar di restoran",
  preposition_usage: "Jelaskan rute dari rumahmu ke tempat favorit, lokasi demi lokasi",
  article_usage: "Deskripsikan isi kamarmu dan barang-barang yang ingin kamu beli",
  word_order: "Diskusi ringan: setuju atau tidak, sampaikan pendapat + alasannya",
  vocabulary_choice: "Jelaskan hobi favoritmu sedetail mungkin ke teman baru",
  other: "Ngobrol santai tentang kabar dan aktivitas minggu ini",
};

const LABELS: Record<MistakeCategory, string> = {
  verb_conjugation: "konjugasi kata kerja",
  tense_usage: "penggunaan tense",
  gender_agreement: "kesesuaian gender",
  plural_agreement: "kesesuaian jamak",
  preposition_usage: "preposisi",
  article_usage: "artikel",
  word_order: "urutan kata",
  vocabulary_choice: "pilihan kosakata",
  other: "pola lainnya",
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
        ? `Kamu paling sering keliru di ${LABELS[primary]} (${primaryCount}×) dan ${LABELS[focusCategories[1]]} — latihan ini dirancang buat keduanya.`
        : `Kamu paling sering keliru di ${LABELS[primary]} (${primaryCount}×) — latihan ini dirancang buat itu.`,
  };
}
