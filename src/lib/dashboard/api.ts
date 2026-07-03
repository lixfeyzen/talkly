import { apiFetch } from '@/lib/api/client';

export type TopWeakness = {
  category: string;
  occurrenceCount: number;
};

export type RecentCorrection = {
  category: string;
  originalText: string;
  correctedText: string;
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
};

export type DashboardData = {
  topWeaknesses: TopWeakness[];
  activity: {
    totalSessions: number;
    totalCorrections: number;
    lastPracticedAt: string | null;
  };
  recentCorrections: RecentCorrection[];
  streak: StreakData;
};

export async function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/dashboard', { auth: true });
}

// Label kategori kesalahan yang ramah dibaca (bukan snake_case mentah).
const CATEGORY_LABELS: Record<string, string> = {
  verb_conjugation: 'Konjugasi kata kerja',
  tense_usage: 'Penggunaan tense',
  gender_agreement: 'Kesesuaian gender',
  plural_agreement: 'Kesesuaian jamak',
  preposition_usage: 'Preposisi',
  article_usage: 'Artikel (a/the/le/la)',
  word_order: 'Urutan kata',
  vocabulary_choice: 'Pilihan kosakata',
  other: 'Lainnya',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
