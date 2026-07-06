import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationSessions, mistakePatterns, userMistakeStats } from "@/lib/db/schema";
import type { ChatTurn } from "@/lib/ai/conversation";
import type { MistakeCategory } from "@/lib/ai/mistake-categories";

export async function createSession(
  userId: string,
  scenario: string,
  targetLanguage: string,
  focusCategories: MistakeCategory[] = [],
  mode: "free" | "mock_interview" = "free",
  interviewRole: string | null = null,
) {
  const [session] = await db
    .insert(conversationSessions)
    .values({ userId, scenario, targetLanguage, transcript: [], focusCategories, mode, interviewRole })
    .returning();
  return session;
}

// Daftar sesi user untuk layar riwayat: terbaru dulu, ringkas (jumlah pesan +
// cuplikan pesan terakhir dihitung di server supaya payload kecil).
export async function listSessionsForUser(userId: string, limit = 50) {
  const rows = await db
    .select()
    .from(conversationSessions)
    .where(eq(conversationSessions.userId, userId))
    .orderBy(sql`${conversationSessions.createdAt} DESC`)
    .limit(limit);
  return rows.map((s) => {
    const transcript = (s.transcript as ChatTurn[]) ?? [];
    const last = transcript[transcript.length - 1];
    return {
      id: s.id,
      scenario: s.scenario,
      mode: s.mode,
      interviewRole: s.interviewRole,
      createdAt: s.createdAt,
      messageCount: transcript.length,
      lastMessage: last ? String(last.content).slice(0, 120) : null,
    };
  });
}

export async function getSessionForUser(sessionId: string, userId: string) {
  const rows = await db
    .select()
    .from(conversationSessions)
    .where(and(eq(conversationSessions.id, sessionId), eq(conversationSessions.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function appendTurns(sessionId: string, newTurns: ChatTurn[]) {
  const [session] = await db
    .select({ transcript: conversationSessions.transcript })
    .from(conversationSessions)
    .where(eq(conversationSessions.id, sessionId))
    .limit(1);

  const existing = (session?.transcript as ChatTurn[] | undefined) ?? [];

  await db
    .update(conversationSessions)
    .set({ transcript: [...existing, ...newTurns] })
    .where(eq(conversationSessions.id, sessionId));
}

type DetectedMistake = { category: MistakeCategory; originalText: string; correctedText: string };

export async function recordMistakes(
  userId: string,
  sessionId: string,
  mistakes: DetectedMistake[],
) {
  if (mistakes.length === 0) return;

  await db.insert(mistakePatterns).values(
    mistakes.map((m) => ({
      userId,
      sessionId,
      category: m.category,
      originalText: m.originalText,
      correctedText: m.correctedText,
    })),
  );

  for (const mistake of mistakes) {
    await db
      .insert(userMistakeStats)
      .values({ userId, category: mistake.category, occurrenceCount: 1 })
      .onConflictDoUpdate({
        target: [userMistakeStats.userId, userMistakeStats.category],
        set: {
          occurrenceCount: sql`${userMistakeStats.occurrenceCount} + 1`,
          lastSeenAt: sql`now()`,
        },
      });
  }
}
