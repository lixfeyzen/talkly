import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationSessions, mistakePatterns, userMistakeStats } from "@/lib/db/schema";
import { getStreak, type StreakData } from "@/lib/data/streaks";
import { getLatestReport } from "@/lib/data/interview-reports";

export type TopWeakness = {
  category: string;
  occurrenceCount: number;
};

export type RecentCorrection = {
  category: string;
  originalText: string;
  correctedText: string;
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
  // Skor mock interview terakhir (fitur #6); null = belum pernah interview.
  latestReadiness: { score: number; sessionId: string; createdAt: string } | null;
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  // Top weaknesses: kategori kesalahan paling sering, dari tabel agregat yang
  // sudah di-maintain tiap sesi (bukan hitung ulang dari mistake_patterns).
  const topWeaknesses = await db
    .select({
      category: userMistakeStats.category,
      occurrenceCount: userMistakeStats.occurrenceCount,
    })
    .from(userMistakeStats)
    .where(eq(userMistakeStats.userId, userId))
    .orderBy(desc(userMistakeStats.occurrenceCount))
    .limit(5);

  // Ringkasan aktivitas: 3 angka dalam 1 query agregat, hindari N+1.
  const [sessionAgg] = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      lastPracticedAt: sql<string | null>`max(${conversationSessions.createdAt})`,
    })
    .from(conversationSessions)
    .where(eq(conversationSessions.userId, userId));

  const [correctionAgg] = await db
    .select({ totalCorrections: sql<number>`count(*)::int` })
    .from(mistakePatterns)
    .where(eq(mistakePatterns.userId, userId));

  const recentCorrections = await db
    .select({
      category: mistakePatterns.category,
      originalText: mistakePatterns.originalText,
      correctedText: mistakePatterns.correctedText,
    })
    .from(mistakePatterns)
    .where(eq(mistakePatterns.userId, userId))
    .orderBy(desc(mistakePatterns.createdAt))
    .limit(5);

  const streak = await getStreak(userId);

  const latest = await getLatestReport(userId);
  const latestReadiness = latest
    ? {
        score: latest.score,
        sessionId: latest.sessionId,
        createdAt: latest.createdAt.toISOString(),
      }
    : null;

  return {
    streak,
    latestReadiness,
    topWeaknesses,
    activity: {
      totalSessions: sessionAgg?.totalSessions ?? 0,
      totalCorrections: correctionAgg?.totalCorrections ?? 0,
      lastPracticedAt: sessionAgg?.lastPracticedAt ?? null,
    },
    recentCorrections,
  };
}

// Dipakai test isolasi: pastikan user lain nggak kebawa. Tidak diekspos ke API.
export async function _countUserSessions(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversationSessions)
    .where(and(eq(conversationSessions.userId, userId)));
  return row?.n ?? 0;
}
