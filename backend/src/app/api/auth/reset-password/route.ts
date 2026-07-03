import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPassword } from "@/lib/auth/password-reset";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, code, newPassword } = parsed.data;

  try {
    const result = await resetPassword(email, code, newPassword);
    if (!result.ok) {
      // 400 dengan alasan generik -- tidak membedakan email salah / kode
      // salah / kedaluwarsa (anti information leak). too_many_attempts
      // dibedakan supaya user tahu harus minta kode BARU, bukan coba terus.
      return jsonCors({ error: result.reason }, { status: 400 });
    }
    return jsonCors({ ok: true });
  } catch (err) {
    console.error("Password reset failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
