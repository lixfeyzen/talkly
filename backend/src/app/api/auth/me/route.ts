import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

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
