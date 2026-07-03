import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { sendMessageSchema } from "@/lib/validations/conversation";
import { runConversationTurn, type ChatTurn } from "@/lib/ai/conversation";
import {
  createSession,
  getSessionForUser,
  appendTurns,
  recordMistakes,
} from "@/lib/data/conversations";

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
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
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }
    history = (session.transcript as ChatTurn[]) ?? [];
    scenario = session.scenario;
    targetLanguage = session.targetLanguage;
  } else {
    if (!scenario || !targetLanguage) {
      return NextResponse.json(
        { error: "scenario_and_targetLanguage_required_for_new_session" },
        { status: 400 },
      );
    }
    const session = await createSession(auth.userId, scenario, targetLanguage);
    sessionId = session.id;
  }

  const result = await runConversationTurn(scenario, targetLanguage, history, message);

  const newTurns: ChatTurn[] = [
    { role: "user", content: message },
    { role: "assistant", content: result.reply },
  ];
  await appendTurns(sessionId, newTurns);
  await recordMistakes(auth.userId, sessionId, result.mistakes);

  return NextResponse.json({
    sessionId,
    reply: result.reply,
    mistakes: result.mistakes,
  });
}
