import { desc, eq, sql } from "drizzle-orm";
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
  // 6 query INDEPENDEN dijalankan paralel (bukan sequential await): untuk
  // user global yang jauh dari region DB, ini memangkas 6x round-trip jadi 1x
  // wall-clock. Dashboard = layar paling sering dibuka -> dampak terasa.
  const [topWeaknesses, [sessionAgg], [correctionAgg], recentCorrections, streak, latest] =
    await Promise.all([
      // Top weaknesses: dari tabel agregat yg di-maintain tiap sesi.
      db
        .select({
          category: userMistakeStats.category,
          occurrenceCount: userMistakeStats.occurrenceCount,
        })
        .from(userMistakeStats)
        .where(eq(userMistakeStats.userId, userId))
        .orderBy(desc(userMistakeStats.occurrenceCount))
        .limit(5),
      // Ringkasan aktivitas: 2 angka dalam 1 query agregat.
      db
        .select({
          totalSessions: sql<number>`count(*)::int`,
          lastPracticedAt: sql<string | null>`max(${conversationSessions.createdAt})`,
        })
        .from(conversationSessions)
        .where(eq(conversationSessions.userId, userId)),
      db
        .select({ totalCorrections: sql<number>`count(*)::int` })
        .from(mistakePatterns)
        .where(eq(mistakePatterns.userId, userId)),
      db
        .select({
          category: mistakePatterns.category,
          originalText: mistakePatterns.originalText,
          correctedText: mistakePatterns.correctedText,
        })
        .from(mistakePatterns)
        .where(eq(mistakePatterns.userId, userId))
        .orderBy(desc(mistakePatterns.createdAt))
        .limit(5),
      getStreak(userId),
      getLatestReport(userId),
    ]);

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
