import { createHash, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetCodes } from "@/lib/db/schema";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 menit
const MAX_ATTEMPTS = 5; // kode 6 digit = 1 juta kombinasi; 5 percobaan = aman
const RESEND_COOLDOWN_MS = 60 * 1000; // anti-spam: 1 permintaan per menit
const SALT_ROUNDS = 10;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Minta kode reset. SELALU "sukses" dari sisi pemanggil route (anti
// email-enumeration: penyerang tidak boleh bisa membedakan email terdaftar
// atau tidak). Kode mentah hanya dikembalikan ke lapisan pengiriman email --
// TIDAK pernah masuk respons HTTP.
export async function requestPasswordReset(
  email: string,
  now: Date = new Date(),
): Promise<{ delivery: { email: string; code: string } | null }> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return { delivery: null }; // email tak terdaftar -> diam, tetap generik
  }

  // Cooldown: kalau baru saja minta kode, jangan buat lagi (anti-spam email).
  const [recent] = await db
    .select({ createdAt: passwordResetCodes.createdAt })
    .from(passwordResetCodes)
    .where(
      and(
        eq(passwordResetCodes.userId, user.id),
        isNull(passwordResetCodes.usedAt),
        gt(passwordResetCodes.createdAt, new Date(now.getTime() - RESEND_COOLDOWN_MS)),
      ),
    )
    .limit(1);
  if (recent) {
    return { delivery: null }; // kode barusan sudah dikirim; tetap generik
  }

  // randomInt = CSPRNG (crypto), bukan Math.random -- kode tidak bisa ditebak
  // dari seed. Rentang 100000-999999 supaya selalu 6 digit.
  const code = String(randomInt(100000, 1000000));

  // Satu kode aktif per user: kode lama yang belum terpakai dibatalkan.
  await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, user.id));
  await db.insert(passwordResetCodes).values({
    userId: user.id,
    codeHash: hashCode(code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    // createdAt eksplisit dari `now` yang sama (bukan defaultNow() milik jam
    // server DB) -- cooldown membandingkan dua timestamp dari sumber jam yang
    // sama, tidak kacau karena clock skew app-vs-DB, dan bisa dites.
    createdAt: now,
  });

  return { delivery: { email: user.email, code } };
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid_or_expired" | "too_many_attempts" };

// Tukar kode + password baru. Semua kegagalan (email salah, kode salah,
// kedaluwarsa, sudah dipakai) -> "invalid_or_expired" yang sama, supaya
// respons tidak membocorkan informasi apa pun.
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
  now: Date = new Date(),
): Promise<ResetResult> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  const [row] = await db
    .select()
    .from(passwordResetCodes)
    .where(and(eq(passwordResetCodes.userId, user.id), isNull(passwordResetCodes.usedAt)))
    .orderBy(desc(passwordResetCodes.createdAt))
    .limit(1);

  if (!row || row.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "invalid_or_expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (row.codeHash !== hashCode(code)) {
    // Hitung percobaan gagal DI DATABASE (bukan di memori) -- tahan restart
    // server & konsisten antar-instance.
    await db
      .update(passwordResetCodes)
      .set({ attempts: sql`${passwordResetCodes.attempts} + 1` })
      .where(eq(passwordResetCodes.id, row.id));
    return { ok: false, reason: "invalid_or_expired" };
  }

  // Consume the valid code and change the password/session generation atomically.
  // A concurrent attempt cannot reuse the code or change the password a second time.
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const changed = await db.execute(sql`
    WITH consumed AS (
      UPDATE password_reset_codes SET used_at = ${now.toISOString()}::timestamptz
      WHERE id = ${row.id} AND user_id = ${user.id} AND used_at IS NULL
        AND expires_at > ${now.toISOString()}::timestamptz AND attempts < ${MAX_ATTEMPTS}
        AND code_hash = ${hashCode(code)}
      RETURNING user_id
    )
    UPDATE users SET password_hash = ${passwordHash}, auth_version = auth_version + 1
    FROM consumed WHERE users.id = consumed.user_id RETURNING users.id
  `);
  return changed.rows.length ? { ok: true } : { ok: false, reason: "invalid_or_expired" };
}
