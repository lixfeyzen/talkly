import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { updateProfileSchema } from "@/lib/validations/profile";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Set/ubah bahasa native user (dari onboarding, nanti juga dari pengaturan).
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors({ error: "invalid_input" }, { status: 400 });
  }

  try {
    await db
      .update(users)
      .set({ nativeLanguage: parsed.data.nativeLanguage })
      .where(eq(users.id, auth.userId));
    return jsonCors({ ok: true, nativeLanguage: parsed.data.nativeLanguage });
  } catch (err) {
    console.error("Profile update failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
