import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { usageCounters } from "@/lib/db/schema";

// Rate limiting fixed-window per-subject, dihitung di DB (serverless-safe).
// Kenapa bukan in-memory: tiap invocation Vercel bisa instance berbeda --
// hitungan di memori bocor. Pola sama dgn brute-force lock reset password.
//
// Request yang DITOLAK tetap menaikkan hitungan menit (standar fixed-window:
// spam terus = tetap terkunci, penyerang tak bisa "mengintip" sisa kuota).
const LIMITS = {
  // Panggilan AI berbayar (conversations, speech, interview report) --
  // SATU bucket bersama per-user supaya total spend per user terpagar.
  ai: { perMinute: 12, perDay: 200 },
  // Registrasi per-IP (anti pabrik akun).
  register: { perMinute: 5, perDay: 20 },
  loginIp: { perMinute: 20, perDay: 300 },
  loginAccount: { perMinute: 10, perDay: 100 },
} as const;

export type RateAction = keyof typeof LIMITS;

export type QuotaResult =
  | { allowed: true }
  | { allowed: false; scope: "minute" | "day"; retryAfterSec: number };

function minuteBucket(action: string, now: Date): string {
  return `${action}:m:${now.toISOString().slice(0, 16)}`; // per-menit UTC
}
function dayBucket(action: string, now: Date): string {
  return `${action}:d:${now.toISOString().slice(0, 10)}`; // per-hari UTC
}

async function increment(subject: string, bucket: string): Promise<number> {
  const [row] = await db
    .insert(usageCounters)
    .values({ subject, bucket })
    .onConflictDoUpdate({
      target: [usageCounters.subject, usageCounters.bucket],
      set: { count: sql`${usageCounters.count} + 1` },
    })
    .returning({ count: usageCounters.count });
  return row.count;
}

// param `now` bisa diinjeksi utk test (pola sama dgn streak).
export async function consumeQuota(
  subject: string,
  action: RateAction,
  now: Date = new Date(),
): Promise<QuotaResult> {
  const limits = LIMITS[action];

  const minuteCount = await increment(subject, minuteBucket(action, now));
  if (minuteCount > limits.perMinute) {
    return { allowed: false, scope: "minute", retryAfterSec: 60 - now.getUTCSeconds() };
  }

  // Hitungan harian hanya naik utk request yang lolos gerbang menit --
  // spam yang sudah tertolak tidak menghanguskan jatah hari user.
  const dayCount = await increment(subject, dayBucket(action, now));
  if (dayCount > limits.perDay) {
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return {
      allowed: false,
      scope: "day",
      retryAfterSec: Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000)),
    };
  }

  return { allowed: true };
}

// IP client di belakang proxy Vercel. Fallback "unknown" menggabungkan
// request tanpa header ke satu bucket -- lebih aman gagal-tertutup drpd bebas.
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
