// Weekly challenges data layer.
// Status flow: locked → available → completed.
// Unlock rule: minggu N+1 available kalau minggu N completed.
// Minggu 1 available langsung untuk user baru.
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { weeklyChallenges, conversationSessions } from "@/lib/db/schema";

// Default scenario per minggu (jika user belum ada data kelemahan).
const DEFAULT_SCENARIOS: Record<number, string> = {
  1: "Tell me about yourself",
  2: "Job interview",
  3: "Salary negotiation",
  4: "Small talk with a colleague",
  5: "Client meeting Q&A",
  6: "Networking event",
  7: "Tell me about yourself (advanced)",
  8: "Job interview (senior role)",
  9: "Salary negotiation (competing offer)",
  10: "Small talk with a colleague (conflict)",
  11: "Client meeting Q&A (objection handling)",
  12: "Networking event (elevator pitch)",
};

// Total minggu challenge tersedia.
export const TOTAL_WEEKS = 12;

export type ChallengeStatus = "locked" | "available" | "completed";

export type WeeklyChallenge = {
  weekNumber: number;
  status: ChallengeStatus;
  scenario: string;
  focusCategory: string | null;
  score: number | null;
  completedAt: string | null;
};

export type ChallengeProgress = {
  totalWeeks: number;
  completedCount: number;
  currentWeek: number; // minggu yang sedang available (bisa sama dengan completedCount+1)
  nextLockedWeek: number; // minggu berikutnya yang masih locked
};

// Pastikan 12 minggu challenge ada untuk user. Kalau belum, create semua
// dengan status locked, kecuali minggu 1 = available.
async function ensureChallengesExist(userId: string): Promise<void> {
  const existing = await db
    .select({ weekNumber: weeklyChallenges.weekNumber })
    .from(weeklyChallenges)
    .where(eq(weeklyChallenges.userId, userId));

  if (existing.length > 0) return; // sudah ada

  const rows = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    rows.push({
      userId,
      weekNumber: w,
      status: w === 1 ? "available" : "locked",
      scenario: DEFAULT_SCENARIOS[w] ?? `Weekly challenge ${w}`,
      focusCategory: null,
    });
  }

  await db.insert(weeklyChallenges).values(rows);
}

// Dapatkan semua challenge untuk user (sorted ascending).
export async function getWeeklyChallenges(userId: string): Promise<WeeklyChallenge[]> {
  await ensureChallengesExist(userId);

  const rows = await db
    .select()
    .from(weeklyChallenges)
    .where(eq(weeklyChallenges.userId, userId))
    .orderBy(weeklyChallenges.weekNumber);

  return rows.map(mapRowToChallenge);
}

// Dapatkan challenge spesifik per minggu.
export async function getChallenge(userId: string, weekNumber: number): Promise<WeeklyChallenge | null> {
  await ensureChallengesExist(userId);

  const rows = await db
    .select()
    .from(weeklyChallenges)
    .where(and(eq(weeklyChallenges.userId, userId), eq(weeklyChallenges.weekNumber, weekNumber)));

  return rows.length > 0 ? mapRowToChallenge(rows[0]) : null;
}

// Mulai challenge: unlock jika locked dan previous week completed.
// Return sessionId untuk mulai percakapan, atau null jika tidak bisa start.
export async function startChallenge(userId: string, weekNumber: number): Promise<string | null> {
  const challenge = await getChallenge(userId, weekNumber);
  if (!challenge) return null;

  // Hanya bisa start jika available atau completed (retry? — untuk MVP, completed = bisa ulang)
  if (challenge.status === "locked") {
    // Cek apakah previous week completed → unlock
    if (weekNumber > 1) {
      const prev = await getChallenge(userId, weekNumber - 1);
      if (prev?.status === "completed") {
        // Unlock challenge ini
        await db
          .update(weeklyChallenges)
          .set({ status: "available" })
          .where(and(eq(weeklyChallenges.userId, userId), eq(weeklyChallenges.weekNumber, weekNumber)));
      } else {
        return null; // previous belum completed
      }
    } else {
      return null; // minggu 1 locked? seharusnya tidak terjadi
    }
  }

  // Buat conversation session dengan mode weekly_challenge
  const [session] = await db
    .insert(conversationSessions)
    .values({
      userId,
      scenario: challenge.scenario,
      targetLanguage: "English",
      transcript: [],
      focusCategories: challenge.focusCategory ? [challenge.focusCategory] : [],
      mode: "weekly_challenge",
    })
    .returning({ id: conversationSessions.id });

  return session.id;
}

// Submit challenge: mark completed + simpan score.
export async function submitChallenge(userId: string, weekNumber: number, score: number): Promise<void> {
  await db
    .update(weeklyChallenges)
    .set({
      status: "completed",
      score,
      completedAt: new Date(),
    })
    .where(and(eq(weeklyChallenges.userId, userId), eq(weeklyChallenges.weekNumber, weekNumber)));

  // Otomatis unlock minggu berikutnya jika ada
  const nextWeek = weekNumber + 1;
  if (nextWeek <= TOTAL_WEEKS) {
    const next = await getChallenge(userId, nextWeek);
    if (next?.status === "locked") {
      await db
        .update(weeklyChallenges)
        .set({ status: "available" })
        .where(and(eq(weeklyChallenges.userId, userId), eq(weeklyChallenges.weekNumber, nextWeek)));
    }
  }
}

// Progress summary: berapa selesai, minggu berapa yang available, dst.
export async function getChallengeProgress(userId: string): Promise<ChallengeProgress> {
  const challenges = await getWeeklyChallenges(userId);

  const completed = challenges.filter((c) => c.status === "completed");
  const completedCount = completed.length;

  // Cari minggu pertama yang locked
  const firstLocked = challenges.find((c) => c.status === "locked");
  const nextLockedWeek = firstLocked ? firstLocked.weekNumber : TOTAL_WEEKS + 1;

  // Minggu current = completedCount + 1 (minggu yang available sekarang)
  const currentWeek = Math.min(completedCount + 1, TOTAL_WEEKS);

  return {
    totalWeeks: TOTAL_WEEKS,
    completedCount,
    currentWeek,
    nextLockedWeek,
  };
}

function mapRowToChallenge(row: {
  weekNumber: number;
  status: string;
  scenario: string;
  focusCategory: string | null;
  score: number | null;
  completedAt: Date | null;
}): WeeklyChallenge {
  return {
    weekNumber: row.weekNumber,
    status: row.status as ChallengeStatus,
    scenario: row.scenario,
    focusCategory: row.focusCategory,
    score: row.score,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}
