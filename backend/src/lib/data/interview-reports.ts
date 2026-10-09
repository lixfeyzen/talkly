import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewReports, conversationSessions } from "@/lib/db/schema";
import { PRACTICE_RUBRIC_VERSION } from "@/lib/ai/report-rubric";
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

// Historical compatibility field, filtered by owner/role/rubric.
// This is a previous report value, not proof of equivalent tasks or learning.
export async function getPreviousScore(
  userId: string,
  beforeCreatedAt: Date,
  exceptSessionId: string,
) {
  const rubric = sql<string | null>`${interviewReports.report}->>'rubricVersion'`;
  const [reference] = await db
    .select({ role: conversationSessions.interviewRole, rubricVersion: rubric })
    .from(interviewReports)
    .innerJoin(conversationSessions, eq(conversationSessions.id, interviewReports.sessionId))
    .where(and(
      eq(interviewReports.userId, userId), eq(conversationSessions.userId, userId),
      eq(interviewReports.sessionId, exceptSessionId),
    )).limit(1);
  if (!reference?.role || reference.rubricVersion !== PRACTICE_RUBRIC_VERSION) return null;

  const [previous] = await db
    .select({ score: interviewReports.score })
    .from(interviewReports)
    .innerJoin(conversationSessions, eq(conversationSessions.id, interviewReports.sessionId))
    .where(and(
      eq(interviewReports.userId, userId), eq(conversationSessions.userId, userId),
      ne(interviewReports.sessionId, exceptSessionId),
      lt(interviewReports.createdAt, beforeCreatedAt),
      eq(conversationSessions.interviewRole, reference.role),
      eq(rubric, reference.rubricVersion),
    ))
    .orderBy(desc(interviewReports.createdAt)).limit(1);
  return previous?.score ?? null;
}

// Buat tile "Latest practice report" di dashboard.
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
