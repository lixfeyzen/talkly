import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { sendMessageSchema } from "@/lib/validations/conversation";
import { runConversationTurn, type ChatTurn } from "@/lib/ai/conversation";
import { MISTAKE_CATEGORIES, type MistakeCategory } from "@/lib/ai/mistake-categories";
import {
  buildInterviewSystemPrompt,
  countAnswers,
  getInterviewQuestions,
  isInterviewFinished,
  QUESTIONS_PER_INTERVIEW,
  type InterviewRole,
} from "@/lib/ai/interview";
import {
  createSession,
  getSessionForUser,
  listSessionsForUser,
  appendTurns,
  recordMistakes,
} from "@/lib/data/conversations";
import { recordPractice } from "@/lib/data/streaks";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Daftar riwayat percakapan user (layar history). Murni baca DB, tanpa AI.
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
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
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { message } = parsed.data;
  let sessionId = parsed.data.sessionId;
  let history: ChatTurn[] = [];
  let scenario = parsed.data.scenario;
  let targetLanguage = parsed.data.targetLanguage;
  let focusCategories: MistakeCategory[] = parsed.data.focusCategories ?? [];
  let mode: "free" | "mock_interview" = parsed.data.mode ?? "free";
  let interviewRole: InterviewRole | null = parsed.data.interviewRole ?? null;

  if (sessionId) {
    const session = await getSessionForUser(sessionId, auth.userId);
    if (!session) {
      return jsonCors({ error: "session_not_found" }, { status: 404 });
    }
    history = (session.transcript as ChatTurn[]) ?? [];
    scenario = session.scenario;
    targetLanguage = session.targetLanguage;
    // Sesi lanjutan pakai fokus & mode yang tersimpan -- konsisten sepanjang sesi.
    focusCategories = (session.focusCategories as MistakeCategory[] | undefined) ?? [];
    mode = (session.mode as "free" | "mock_interview") ?? "free";
    interviewRole = (session.interviewRole as InterviewRole | null) ?? null;

    // Interview sudah selesai (5 jawaban) -> tolak giliran tambahan; client
    // seharusnya mengarah ke rapor.
    if (mode === "mock_interview" && isInterviewFinished(history)) {
      return jsonCors({ error: "interview_finished" }, { status: 409 });
    }
  } else {
    if (mode === "mock_interview") {
      // Skenario & bahasa ditetapkan server utk interview -- konsisten.
      scenario = `Mock interview: ${interviewRole}`;
      targetLanguage = "English";
    }
    if (!scenario || !targetLanguage) {
      return jsonCors(
        { error: "scenario_and_targetLanguage_required_for_new_session" },
        { status: 400 },
      );
    }
    const session = await createSession(
      auth.userId,
      scenario,
      targetLanguage,
      focusCategories,
      mode,
      interviewRole,
    );
    sessionId = session.id;
  }

  // Cap riwayat yang dikirim ke OpenAI (bukan yang disimpan di DB) --
  // sesi yang panjang bisa bikin tiap request ngirim ulang puluhan giliran,
  // makin lama makin mahal & makin lambat tanpa batas. 20 giliran terakhir
  // cukup buat AI tetap "inget" konteks percakapan yang relevan.
  const MAX_HISTORY_TURNS = 20;
  const recentHistory = history.slice(-MAX_HISTORY_TURNS);

  // Bahasa native user -> penjelasan koreksi (field note) ditulis dalam
  // bahasa itu. null (belum onboarding) -> default Indonesian di prompt.
  const [userRow] = await db
    .select({ nativeLanguage: users.nativeLanguage })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  // Mode interview: prompt interviewer terstruktur (pertanyaan deterministik
  // per-sessionId, progress diturunkan dari jumlah jawaban di transkrip).
  let systemPromptOverride: string | undefined;
  if (mode === "mock_interview" && interviewRole) {
    const questions = getInterviewQuestions(interviewRole, sessionId);
    systemPromptOverride = buildInterviewSystemPrompt(
      interviewRole,
      questions,
      countAnswers(history),
      userRow?.nativeLanguage ?? null,
      MISTAKE_CATEGORIES,
    );
  }

  let result;
  try {
    result = await runConversationTurn(
      scenario,
      targetLanguage,
      recentHistory,
      message,
      focusCategories,
      userRow?.nativeLanguage ?? null,
      systemPromptOverride,
    );
  } catch (err) {
    console.error("OpenAI conversation turn failed:", err);
    return jsonCors({ error: "ai_service_unavailable" }, { status: 502 });
  }

  const newTurns: ChatTurn[] = [
    { role: "user", content: message },
    { role: "assistant", content: result.reply },
  ];
  await appendTurns(sessionId, newTurns);
  await recordMistakes(auth.userId, sessionId, result.mistakes);
  // Streak harian (fitur #4): tiap giliran latihan yang sukses menghitung
  // sebagai "latihan hari ini". Idempoten per-hari, jadi aman dipanggil
  // berkali-kali dalam satu hari. Ikut dikembalikan supaya UI bisa langsung
  // merayakan kenaikan streak tanpa fetch tambahan.
  const streak = await recordPractice(auth.userId);

  // Info progress interview buat UI ("Question 3/5", tombol lihat rapor).
  const answersAfterThis = countAnswers(history) + 1;
  const interview =
    mode === "mock_interview"
      ? {
          questionNumber: Math.min(answersAfterThis + 1, QUESTIONS_PER_INTERVIEW),
          total: QUESTIONS_PER_INTERVIEW,
          finished: answersAfterThis >= QUESTIONS_PER_INTERVIEW,
        }
      : undefined;

  return jsonCors({
    sessionId,
    reply: result.reply,
    mistakes: result.mistakes,
    streak,
    interview,
  });
}
