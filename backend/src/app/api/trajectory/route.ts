import { NextRequest } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviewReports, mistakePatterns, conversationSessions } from "@/lib/db/schema";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { buildTrajectory } from "@/lib/trajectory/trajectory";
import { categoryLabel } from "@/lib/ai/adaptive-scenario";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Practice history: skor mock lintas-waktu + tren kesalahan 14-hari.
// Murni baca-agregasi (nol AI); user baru dapat struktur kosong + insight
// ajakan, bukan error.
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [reports, mistakes] = await Promise.all([
      db
        .select({
          score: interviewReports.score, createdAt: interviewReports.createdAt,
          role: conversationSessions.interviewRole,
          rubricVersion: sql<string | null>`${interviewReports.report}->>'rubricVersion'`,
        })
        .from(interviewReports)
        .innerJoin(conversationSessions, eq(conversationSessions.id, interviewReports.sessionId))
        .where(and(eq(interviewReports.userId, auth.userId), eq(conversationSessions.userId, auth.userId)))
        .orderBy(asc(interviewReports.createdAt)),
      db
        .select({ category: mistakePatterns.category, createdAt: mistakePatterns.createdAt })
        .from(mistakePatterns)
        .where(eq(mistakePatterns.userId, auth.userId)),
    ]);

    const trajectory = buildTrajectory(reports, mistakes, new Date(), categoryLabel);
    return jsonCors(trajectory);
  } catch (err) {
    console.error("Trajectory query failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
