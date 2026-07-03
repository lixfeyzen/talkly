import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userStreaks } from "@/lib/db/schema";

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null; // "YYYY-MM-DD" (UTC) atau null kalau belum pernah latihan
};

// Tanggal hari ini dalam UTC, format "YYYY-MM-DD" -- konsisten dengan kolom
// `date` di Postgres. Batasan MVP yang disengaja: hari dihitung UTC, bukan
// timezone user (kerumitan V2).
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  const ms = Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// Dipanggil tiap user menyelesaikan giliran latihan. Aturan per-hari kalender:
// - hari yang sama dengan latihan terakhir -> streak tetap (idempoten)
// - tepat 1 hari setelahnya -> streak + 1
// - lebih dari 1 hari (bolong) -> reset ke 1
// `now` bisa di-inject dari test buat simulasi tanggal, default hari ini UTC.
export async function recordPractice(userId: string, now: string = todayUtc()): Promise<StreakData> {
  const [existing] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId))
    .limit(1);

  if (!existing) {
    const [row] = await db
      .insert(userStreaks)
      .values({ userId, currentStreak: 1, longestStreak: 1, lastPracticeDate: now })
      // Guard race dua request pertama yang bersamaan: kalau baris keburu
      // dibuat request lain, jangan gagal -- perlakukan sebagai "hari sama".
      .onConflictDoUpdate({
        target: userStreaks.userId,
        set: { lastPracticeDate: now },
      })
      .returning();
    return toStreakData(row);
  }

  const gap = daysBetween(existing.lastPracticeDate, now);

  if (gap <= 0) {
    // Hari sama (atau clock skew mundur) -- tidak ada perubahan.
    return toStreakData(existing);
  }

  const nextStreak = gap === 1 ? existing.currentStreak + 1 : 1;
  const [row] = await db
    .update(userStreaks)
    .set({
      currentStreak: nextStreak,
      longestStreak: sql`greatest(${userStreaks.longestStreak}, ${nextStreak})`,
      lastPracticeDate: now,
    })
    .where(eq(userStreaks.userId, userId))
    .returning();
  return toStreakData(row);
}

// Baca streak buat ditampilkan. Kalau latihan terakhir sudah lewat dari
// kemarin, streak-nya secara efektif SUDAH putus walau baris di DB belum
// di-reset -- tampilkan 0 (baris DB baru di-reset saat latihan berikutnya).
export async function getStreak(userId: string, now: string = todayUtc()): Promise<StreakData> {
  const [existing] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId))
    .limit(1);

  if (!existing) {
    return { currentStreak: 0, longestStreak: 0, lastPracticeDate: null };
  }

  const gap = daysBetween(existing.lastPracticeDate, now);
  return {
    currentStreak: gap > 1 ? 0 : existing.currentStreak,
    longestStreak: existing.longestStreak,
    lastPracticeDate: existing.lastPracticeDate,
  };
}

function toStreakData(row: typeof userStreaks.$inferSelect): StreakData {
  return {
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastPracticeDate: row.lastPracticeDate,
  };
}
