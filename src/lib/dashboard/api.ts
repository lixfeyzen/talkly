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
  latestReadiness: { score: number; sessionId: string; createdAt: string } | null;
};

export async function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/dashboard', { auth: true });
}

// Label kategori kesalahan yang ramah dibaca (bukan snake_case mentah).
const CATEGORY_LABELS: Record<string, string> = {
  verb_conjugation: 'Verb conjugation',
  tense_usage: 'Tense usage',
  gender_agreement: 'Gender agreement',
  plural_agreement: 'Plural agreement',
  preposition_usage: 'Prepositions',
  article_usage: 'Articles (a/the/le/la)',
  word_order: 'Word order',
  vocabulary_choice: 'Vocabulary choice',
  other: 'Other',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
