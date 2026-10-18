import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { users, usageCounters } from "@/lib/db/schema";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { z } from "zod";
import { consumeQuota } from "@/lib/rate-limit";
import { verifyCredentials } from "@/lib/auth/credentials";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);

  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  // Ambil nativeLanguage dari DB (tidak ada di JWT -- bisa berubah setelah
  // token diterbitkan). null = belum onboarding.
  try {
    const [row] = await db
      .select({ nativeLanguage: users.nativeLanguage, name: users.name })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!row) {
      // Token valid tapi user sudah dihapus dari DB.
      return jsonCors({ error: "unauthorized" }, { status: 401 });
    }

    return jsonCors({
      user: {
        id: auth.userId,
        email: auth.email,
        nativeLanguage: row.nativeLanguage,
        name: row.name,
      },
    });
  } catch (err) {
    console.error("Me query failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}

const deleteAccountSchema = z.object({ password: z.string().min(1).max(200) });

// Hapus akun beserta semua datanya (syarat Google Play: hapus akun dari dalam app).
// Wajib password supaya token curian tidak bisa menghapus akun. Semua tabel
// milik user ikut terhapus lewat ON DELETE CASCADE di schema.
export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonCors({ error: "unauthorized" }, { status: 401 });

  const parsed = deleteAccountSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonCors({ error: "invalid_input" }, { status: 400 });

  const quota = await consumeQuota(`user:${auth.userId}`, "loginAccount");
  if (!quota.allowed) {
    return jsonCors({ error: "rate_limited", retryAfterSec: quota.retryAfterSec }, { status: 429 });
  }

  try {
    const check = await verifyCredentials(auth.email, parsed.data.password);
    // 403, bukan 401: password salah tidak boleh membuat app mengeluarkan user.
    if (!check.ok || check.user.id !== auth.userId) {
      return jsonCors({ error: "wrong_password" }, { status: 403 });
    }
    // Penghitung batas percobaan tidak punya relasi ke users, jadi dihapus manual:
    // kuota AI (userId), kuota hapus akun (user:<id>), dan kuota login per akun
    // (digest email, sama dengan login/route.ts).
    const accountKey = createHmac("sha256", process.env.JWT_SECRET!).update(auth.email).digest("hex");
    await db.delete(usageCounters).where(inArray(usageCounters.subject, [auth.userId, `user:${auth.userId}`, `account:${accountKey}`]));
    await db.delete(users).where(eq(users.id, auth.userId));
    return jsonCors({ deleted: true });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
