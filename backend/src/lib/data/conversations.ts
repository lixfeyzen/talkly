import { and, desc, eq, sql } from "drizzle-orm";
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
  // Hitung jumlah pesan & cuplikan pesan terakhir DI SQL -- jangan tarik
  // transcript jsonb penuh (bisa beberapa KB/sesi) hanya untuk dibuang di JS.
  // Pakai index conversation_sessions_user_created_idx (user_id, created_at).
  return db
    .select({
      id: conversationSessions.id,
      scenario: conversationSessions.scenario,
      mode: conversationSessions.mode,
      interviewRole: conversationSessions.interviewRole,
      createdAt: conversationSessions.createdAt,
      messageCount: sql<number>`jsonb_array_length(${conversationSessions.transcript})`,
      // Elemen terakhir array (Postgres jsonb mendukung indeks negatif) -> field
      // content, dipotong 120 char. NULL kalau transcript kosong.
      lastMessage: sql<
        string | null
      >`left(${conversationSessions.transcript} -> -1 ->> 'content', 120)`,
    })
    .from(conversationSessions)
    .where(eq(conversationSessions.userId, userId))
    .orderBy(desc(conversationSessions.createdAt))
    .limit(limit);
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
  // Append di level SQL (jsonb `||`), bukan read-modify-write di JS. Dua
  // keuntungan: (1) atomic -> dua request paralel utk sesi yang sama tak
  // saling menimpa (lost update); (2) hemat 1 round-trip SELECT tiap giliran.
  await db
    .update(conversationSessions)
    .set({
      transcript: sql`${conversationSessions.transcript} || ${JSON.stringify(newTurns)}::jsonb`,
    })
    .where(eq(conversationSessions.id, sessionId));
}

type DetectedMistake = { category: MistakeCategory; originalText: string; correctedText: string; note?: string };

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
      note: m.note ?? null,
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
