import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { sendMessageSchema } from "@/lib/validations/conversation";
import { runConversationTurn, type ChatTurn } from "@/lib/ai/conversation";
import { finalizeInterviewCorrections } from "@/lib/ai/correction-check";
import { MISTAKE_CATEGORIES, type MistakeCategory } from "@/lib/ai/mistake-categories";
import {
  buildInterviewSystemPrompt,
  buildInterviewOpener,
  countAnswers,
  getInterviewQuestions,
  getJobInterviewQuestions,
  isInterviewFinished,
  QUESTIONS_PER_INTERVIEW,
  INTERVIEW_COMPLETION_REPLY,
  type InterviewRole,
} from "@/lib/ai/interview";
import {
  getSessionForUser,
  listSessionsForUser,
} from "@/lib/data/conversations";
import {
  readTurnRequest, claimTurnRequest, releaseTurnRequest, ensureTurnSession,
  prepareTurnResult, completeTurnRequest, TurnConflict, type TurnRequest,
} from "@/lib/data/turn-requests";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { consumeQuota } from "@/lib/rate-limit";
import { WEEKLY_CHALLENGE_ENABLED, WEEKLY_CHALLENGE_DEFERRED } from "@/lib/features/v1";
import { getReportForSession } from "@/lib/data/interview-reports";
import {
  resolvePracticeContext, savedPracticeContext, buildAnswerPracticePrompt,
} from "@/lib/practice/interview-target";
import type { InterviewReport } from "@/lib/ai/interview-report";
import { jobPackSchema, verifyJobPack, type JobPack } from "@/lib/ai/job-post";
import {
  findTaskSelection, savedTransferContext, freezeTaskSelection,
  buildTaskSelectionPrompt, buildTransferPrompt, validateCriterionCheck, buildTransferReply,
} from "@/lib/practice/criterion-transfer";

export function OPTIONS() {
  return corsPreflight();
}

// Daftar riwayat percakapan user (layar history). Murni baca DB, tanpa AI.
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await listSessionsForUser(auth.userId);
    return jsonCors({ sessions });
  } catch (err) {
    console.error("List sessions failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonCors({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  // Older clients remain compatible; current clients keep this ID for every retry.
  const requestId = input.requestId ?? randomUUID();
  const payloadHash = createHash("sha256").update(JSON.stringify({ ...input, requestId: undefined })).digest("hex");
  let reservation: TurnRequest | null = null;
  try {
    const existing = await readTurnRequest(auth.userId, requestId);
    if (existing && existing.payloadHash !== payloadHash) throw new TurnConflict("request_id_reused");
    // Replay before quota and the finished-interview guard. A lost final response is still recoverable.
    if (existing?.response) return jsonCors(await completeTurnRequest(auth.userId, requestId));

    const requestedSessionId = existing?.sessionId ?? input.sessionId;
    const session = requestedSessionId ? await getSessionForUser(requestedSessionId, auth.userId) : null;
    if (requestedSessionId && !session) return jsonCors({ error: "session_not_found" }, { status: 404 });
    // Finished Weekly replay is read-only; unfinished/prepared Weekly must not commit.
    if (!WEEKLY_CHALLENGE_ENABLED && (input.mode === "weekly_challenge" || session?.mode === "weekly_challenge")) {
      return jsonCors(WEEKLY_CHALLENGE_DEFERRED.body, { status: WEEKLY_CHALLENGE_DEFERRED.status });
    }
    if (existing?.result) return jsonCors(await completeTurnRequest(auth.userId, requestId));
    const history = (session?.transcript as ChatTurn[] | undefined) ?? [];
    const focusCategories = session ? (session.focusCategories as MistakeCategory[]) : (input.focusCategories ?? []);
    const mode = (session?.mode ?? input.mode ?? (input.practiceTarget ? "answer_practice" : input.transferTarget ? "criterion_transfer" : "free")) as "free" | "mock_interview" | "answer_practice" | "criterion_transfer";
    let practiceContext = mode === "answer_practice" ? savedPracticeContext(history) : null;
    let transferContext = mode === "criterion_transfer" ? savedTransferContext(history) : null;
    if (input.practiceTarget && mode !== "answer_practice") {
      return jsonCors({ error: "invalid_practice_target" }, { status: 400 });
    }
    if (mode === "answer_practice") {
      // Only an empty first-attempt session can resolve fresh references.
      // A started practice with missing/invalid metadata must never be rebound.
      if (history.length > 0 && !practiceContext) {
        return jsonCors({ error: "invalid_practice_context" }, { status: 400 });
      }
      if (practiceContext && input.practiceTarget && (
        practiceContext.sourceSessionId !== input.practiceTarget.sourceSessionId ||
        practiceContext.targetId !== input.practiceTarget.targetId
      )) return jsonCors({ error: "session_changed" }, { status: 409 });
      // A continuation uses its frozen server-owned context, even if the source report changes.
      if (!practiceContext && input.practiceTarget) {
        const source = await getSessionForUser(input.practiceTarget.sourceSessionId, auth.userId);
        if (!source) return jsonCors({ error: "session_not_found" }, { status: 404 });
        const sourceReport = await getReportForSession(auth.userId, source.id);
        const resolved = source.mode === "mock_interview" && source.interviewRole && sourceReport
          ? resolvePracticeContext(sourceReport.report as InterviewReport, source.transcript as ChatTurn[], source.interviewRole as InterviewRole, source.id)
          : null;
        if (!resolved || resolved.targetId !== input.practiceTarget.targetId) {
          return jsonCors({ error: "invalid_practice_target" }, { status: 400 });
        }
        practiceContext = resolved;
      }
      if (!practiceContext) return jsonCors({ error: "practice_target_required" }, { status: 400 });
    }
    if (input.transferTarget && mode !== "criterion_transfer") {
      return jsonCors({ error: "invalid_transfer_target" }, { status: 400 });
    }
    if (mode === "criterion_transfer") {
      if (history.length > 0 && !transferContext) return jsonCors({ error: "invalid_transfer_context" }, { status: 400 });
      if (transferContext && input.transferTarget && (
        transferContext.selection.sourceRevisionSessionId !== input.transferTarget.sourceRevisionSessionId ||
        transferContext.selection.selectionId !== input.transferTarget.selectionId
      )) return jsonCors({ error: "session_changed" }, { status: 409 });
      if (!transferContext && input.transferTarget) {
        const revision = await getSessionForUser(input.transferTarget.sourceRevisionSessionId, auth.userId);
        if (!revision) return jsonCors({ error: "session_not_found" }, { status: 404 });
        const revisionHistory = revision.transcript as ChatTurn[];
        const sourceContext = savedPracticeContext(revisionHistory);
        const selection = revision.mode === "answer_practice" && sourceContext
          ? findTaskSelection(revisionHistory, revision.id, input.transferTarget.selectionId) : null;
        if (!selection || !sourceContext || selection.sourceTargetId !== sourceContext.targetId ||
          selection.sourceInterviewSessionId !== sourceContext.sourceSessionId ||
          selection.successCriterion !== sourceContext.successCriterion || selection.instruction !== sourceContext.instruction) {
          return jsonCors({ error: "invalid_transfer_target" }, { status: 400 });
        }
        transferContext = { kind: "guided_application", selection };
      }
      if (!transferContext) return jsonCors({ error: "transfer_target_required" }, { status: 400 });
    }
    const role = (transferContext?.selection.interviewRole ?? practiceContext?.interviewRole ?? session?.interviewRole ?? input.interviewRole ?? null) as InterviewRole | null;
    const scenario = session?.scenario ?? (practiceContext
      ? `Revise interview answer ${practiceContext.answerNumber}`
      : transferContext ? `Guided application: ${transferContext.selection.task.id}`
      : mode === "mock_interview" ? `Mock interview: ${role}` : input.scenario);
    const targetLanguage = session?.targetLanguage ?? (mode !== "free" ? "English" : input.targetLanguage);
    if (!scenario || !targetLanguage) {
      return jsonCors({ error: "scenario_and_targetLanguage_required_for_new_session" }, { status: 400 });
    }
    if (mode === "mock_interview" && isInterviewFinished(history)) {
      return jsonCors({ error: "interview_finished" }, { status: 409 });
    }
    // Latihan dari lowongan: sesi baru membawa paket bertanda tangan; sesi
    // lanjutan memakai paket yang sudah dibekukan di giliran pembuka.
    let jobPack: JobPack | null = null;
    if (mode === "mock_interview") {
      if (history.length === 0 && input.jobPack) {
        jobPack = verifyJobPack(input.jobPack, auth.userId);
        if (!jobPack) return jsonCors({ error: "invalid_job_pack" }, { status: 400 });
      } else if (history.length > 0) {
        const frozen = jobPackSchema.safeParse(history[0]?.role === "assistant" ? history[0].jobPack : undefined);
        jobPack = frozen.success ? frozen.data : null;
      }
    }

    reservation = await claimTurnRequest(auth.userId, requestId, payloadHash, requestedSessionId ?? null);
    if (reservation.response || reservation.result) return jsonCors(await completeTurnRequest(auth.userId, requestId));
    const quota = await consumeQuota(auth.userId, "ai");
    if (!quota.allowed) {
      await releaseTurnRequest(reservation);
      return jsonCors({ error: "rate_limited", retryAfterSec: quota.retryAfterSec }, { status: 429 });
    }
    const sessionId = await ensureTurnSession(reservation, { scenario, targetLanguage, focusCategories, mode, interviewRole: role });
    const [user] = await db.select({ nativeLanguage: users.nativeLanguage }).from(users).where(eq(users.id, auth.userId)).limit(1);
    const native = user?.nativeLanguage ?? null;
    // Freeze explicit model examples as copy exclusions; never use their summaries to bind a source.
    const sourceReport = practiceContext ? await getReportForSession(auth.userId, practiceContext.sourceSessionId) : null;
    const upgrades = (sourceReport?.report as InterviewReport | undefined)?.answerUpgrades;
    const explicitExamples = Array.isArray(upgrades) ? upgrades.flatMap(upgrade => typeof upgrade?.upgraded === "string" ? [upgrade.upgraded] : []) : [];
    const prompt = transferContext ? buildTransferPrompt(transferContext, native)
      : practiceContext
      ? `${buildAnswerPracticePrompt(practiceContext, native)} ${buildTaskSelectionPrompt(practiceContext, native)}`
      : mode === "mock_interview" && role
      ? buildInterviewSystemPrompt(role, jobPack ? getJobInterviewQuestions(jobPack.questions) : getInterviewQuestions(role, sessionId), countAnswers(history), user?.nativeLanguage ?? null, MISTAKE_CATEGORIES)
      : undefined;
    const openingMessage = history.length === 0
      ? transferContext?.selection.task.question ?? practiceContext?.originalQuestion ?? (mode === "mock_interview" && role ? buildInterviewOpener(role) : undefined)
      : undefined;
    const turnHistory: ChatTurn[] = openingMessage
      ? [{ role: "assistant", content: openingMessage }, ...history]
      : history;
    let result;
    try {
      result = await runConversationTurn(scenario, targetLanguage, turnHistory.slice(-20), input.message,
        focusCategories, native, prompt, undefined, undefined,
        transferContext ? "criterion_transfer" : practiceContext ? "answer_revision" : undefined);
    } catch {
      await releaseTurnRequest(reservation);
      console.error("Conversation AI request failed");
      return jsonCors({ error: "ai_service_unavailable" }, { status: 502 });
    }
    if (mode === "mock_interview" && result.mistakes.length > 0) {
      const question = turnHistory.findLast(turn => turn.role === "assistant")?.content ?? "";
      result.mistakes = await finalizeInterviewCorrections(question, input.message, result.mistakes, native);
    }
    const selectionResult = practiceContext ? freezeTaskSelection(result.taskSelection, practiceContext,
      sessionId, input.message, history.filter(turn => turn.role === "user").map(turn => turn.content), explicitExamples, native) : null;
    const criterionCheck = transferContext ? validateCriterionCheck(result.criterionCheck, input.message, transferContext, native) : null;
    // Present the final status in English; this does not verify its semantic truth.
    if (criterionCheck) result.reply = buildTransferReply(criterionCheck.status);
    const answers = countAnswers(history) + 1;
    const interviewFinished = mode === "mock_interview" && answers >= QUESTIONS_PER_INTERVIEW;
    if (interviewFinished) result.reply = INTERVIEW_COMPLETION_REPLY;
    const response = {
      sessionId, reply: result.reply, mistakes: result.mistakes,
      ...(result.feedbackGuidanceVersion !== undefined ? { feedbackGuidanceVersion: result.feedbackGuidanceVersion } : {}),
      ...(practiceContext ? { practiceContext } : {}),
      ...(selectionResult ?? {}),
      ...(transferContext && criterionCheck ? { transferContext, criterionCheck } : {}),
      ...(mode === "mock_interview" ? { interview: {
        questionNumber: Math.min(answers + 1, QUESTIONS_PER_INTERVIEW),
        total: QUESTIONS_PER_INTERVIEW, finished: interviewFinished,
      }} : {}),
    };
    await prepareTurnResult(reservation, {
      message: input.message, openingMessage, ...(practiceContext ? { practiceContext } : {}),
      ...(transferContext ? { transferContext } : {}),
      ...(jobPack && history.length === 0 ? { jobPack } : {}),
      expectedTurns: history.length, createdAt: new Date().toISOString(), response,
    });
    return jsonCors(await completeTurnRequest(auth.userId, requestId));
  } catch (err) {
    if (reservation) await releaseTurnRequest(reservation).catch(() => {});
    if (err instanceof TurnConflict) {
      return jsonCors({ error: err.code, retryAfterSec: err.code === "request_in_progress" ? 2 : undefined }, { status: 409 });
    }
    // Database errors can contain private query parameters. Log the operation, not the payload.
    console.error("Conversation persistence failed");
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
