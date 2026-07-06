import { and, desc, eq, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewReports } from "@/lib/db/schema";
import type { InterviewReport } from "@/lib/ai/interview-report";

// Satu sesi = satu rapor (unique sessionId). Generate ulang -> replace,
// bukan duplikat.
export async function saveReport(userId: string, sessionId: string, report: InterviewReport) {
  const [row] = await db
    .insert(interviewReports)
    .values({ userId, sessionId, score: Math.round(report.score), report })
    .onConflictDoUpdate({
      target: interviewReports.sessionId,
      set: { score: Math.round(report.score), report },
    })
    .returning();
  return row;
}

export async function getReportForSession(userId: string, sessionId: string) {
  const rows = await db
    .select()
    .from(interviewReports)
    .where(and(eq(interviewReports.sessionId, sessionId), eq(interviewReports.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

// Skor mock TEPAT SEBELUM sesi ini (untuk "up N from last time"). Null kalau
// ini interview pertama. Dibandingkan by createdAt, kecualikan sesi ini sendiri.
export async function getPreviousScore(
  userId: string,
  beforeCreatedAt: Date,
  exceptSessionId: string,
) {
  const rows = await db
    .select({ score: interviewReports.score })
    .from(interviewReports)
    .where(
      and(
        eq(interviewReports.userId, userId),
        ne(interviewReports.sessionId, exceptSessionId),
        lt(interviewReports.createdAt, beforeCreatedAt),
      ),
    )
    .orderBy(desc(interviewReports.createdAt))
    .limit(1);
  return rows[0]?.score ?? null;
}

// Buat tile "Latest readiness score" di dashboard.
export async function getLatestReport(userId: string) {
  const rows = await db
    .select({
      score: interviewReports.score,
      sessionId: interviewReports.sessionId,
      createdAt: interviewReports.createdAt,
    })
    .from(interviewReports)
    .where(eq(interviewReports.userId, userId))
    .orderBy(desc(interviewReports.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
