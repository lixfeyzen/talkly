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

// Set/ubah profil user: bahasa native dan/atau nama panggilan (dari
// onboarding maupun pengaturan). Hanya field yang dikirim yang di-update.
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors({ error: "invalid_input" }, { status: 400 });
  }

  const patch: Partial<{ nativeLanguage: string; name: string }> = {};
  if (parsed.data.nativeLanguage !== undefined) patch.nativeLanguage = parsed.data.nativeLanguage;
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;

  try {
    await db.update(users).set(patch).where(eq(users.id, auth.userId));
    return jsonCors({ ok: true, ...patch });
  } catch (err) {
    console.error("Profile update failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
