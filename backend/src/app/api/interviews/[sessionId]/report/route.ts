import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { getSessionForUser } from "@/lib/data/conversations";
import { saveReport, getReportForSession, getPreviousScore } from "@/lib/data/interview-reports";
import { generateInterviewReport, type InterviewReport } from "@/lib/ai/interview-report";
import { isInterviewFinished, type InterviewRole } from "@/lib/ai/interview";
import type { ChatTurn } from "@/lib/ai/conversation";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { consumeQuota } from "@/lib/rate-limit";
import { resolvePracticeContext } from "@/lib/practice/interview-target";

export function OPTIONS() {
  return corsPreflight();
}

type Params = { params: Promise<{ sessionId: string }> };

// Ambil rapor yang sudah ada (dipakai saat buka ulang riwayat).
export async function GET(req: NextRequest, ctx: Params) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonCors({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await ctx.params;
  const row = await getReportForSession(auth.userId, sessionId);
  if (!row) return jsonCors({ error: "report_not_found" }, { status: 404 });
  const previousScore = await getPreviousScore(auth.userId, row.createdAt, sessionId);
  const session = await getSessionForUser(sessionId, auth.userId);
  const practiceContext = session?.mode === "mock_interview" && session.interviewRole
    ? resolvePracticeContext(row.report as InterviewReport, session.transcript as ChatTurn[], session.interviewRole as InterviewRole, sessionId)
    : null;
  return jsonCors({ score: row.score, report: row.report, createdAt: row.createdAt, previousScore, practiceContext });
}

// Generate rapor setelah interview selesai. Idempoten: rapor yang sudah ada
// dikembalikan tanpa memanggil AI lagi (hemat biaya, hasil stabil).
export async function POST(req: NextRequest, ctx: Params) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonCors({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return jsonCors({ error: "invalid_input" }, { status: 400 });
  }

  const session = await getSessionForUser(sessionId, auth.userId);
  if (!session) return jsonCors({ error: "session_not_found" }, { status: 404 });
  if (session.mode !== "mock_interview" || !session.interviewRole) {
    return jsonCors({ error: "not_an_interview_session" }, { status: 400 });
  }

  const history = (session.transcript as ChatTurn[]) ?? [];
  if (!isInterviewFinished(history)) {
    return jsonCors({ error: "interview_not_finished" }, { status: 400 });
  }

  const existing = await getReportForSession(auth.userId, sessionId);
  if (existing) {
    const previousScore = await getPreviousScore(auth.userId, existing.createdAt, sessionId);
    const practiceContext = resolvePracticeContext(existing.report as InterviewReport, history, session.interviewRole as InterviewRole, sessionId);
    return jsonCors({ score: existing.score, report: existing.report, createdAt: existing.createdAt, previousScore, practiceContext });
  }

  // Pagar biaya AI: hanya jalur generate-baru (rapor cached di atas gratis).
  const quota = await consumeQuota(auth.userId, "ai");
  if (!quota.allowed) {
    return jsonCors(
      { error: "rate_limited", retryAfterSec: quota.retryAfterSec },
      { status: 429 },
    );
  }

  const [userRow] = await db
    .select({ nativeLanguage: users.nativeLanguage })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  try {
    const report = await generateInterviewReport(
      session.interviewRole as InterviewRole,
      history,
      userRow?.nativeLanguage ?? null,
    );
    const saved = await saveReport(auth.userId, sessionId, report);
    const previousScore = await getPreviousScore(auth.userId, saved.createdAt, sessionId);
    const practiceContext = resolvePracticeContext(saved.report as InterviewReport, history, session.interviewRole as InterviewRole, sessionId);
    return jsonCors({ score: saved.score, report: saved.report, createdAt: saved.createdAt, previousScore, practiceContext });
  } catch (err) {
    console.error("Interview report generation failed:", err);
    return jsonCors({ error: "ai_service_unavailable" }, { status: 502 });
  }
}
