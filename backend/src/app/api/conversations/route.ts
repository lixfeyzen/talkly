import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { sendMessageSchema } from "@/lib/validations/conversation";
import { runConversationTurn, type ChatTurn } from "@/lib/ai/conversation";
import {
  createSession,
  getSessionForUser,
  appendTurns,
  recordMistakes,
} from "@/lib/data/conversations";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
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

  if (sessionId) {
    const session = await getSessionForUser(sessionId, auth.userId);
    if (!session) {
      return jsonCors({ error: "session_not_found" }, { status: 404 });
    }
    history = (session.transcript as ChatTurn[]) ?? [];
    scenario = session.scenario;
    targetLanguage = session.targetLanguage;
  } else {
    if (!scenario || !targetLanguage) {
      return jsonCors(
        { error: "scenario_and_targetLanguage_required_for_new_session" },
        { status: 400 },
      );
    }
    const session = await createSession(auth.userId, scenario, targetLanguage);
    sessionId = session.id;
  }

  // Cap riwayat yang dikirim ke OpenAI (bukan yang disimpan di DB) --
  // sesi yang panjang bisa bikin tiap request ngirim ulang puluhan giliran,
  // makin lama makin mahal & makin lambat tanpa batas. 20 giliran terakhir
  // cukup buat AI tetap "inget" konteks percakapan yang relevan.
  const MAX_HISTORY_TURNS = 20;
  const recentHistory = history.slice(-MAX_HISTORY_TURNS);

  let result;
  try {
    result = await runConversationTurn(scenario, targetLanguage, recentHistory, message);
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

  return jsonCors({
    sessionId,
    reply: result.reply,
    mistakes: result.mistakes,
  });
}
