import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { sendResetCodeEmail } from "@/lib/email/send-reset-code";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Respons SELALU sama ("kalau email terdaftar, kode terkirim") apa pun yang
// terjadi -- anti email-enumeration: penyerang tidak bisa memakai endpoint
// ini buat mengecek email mana yang punya akun.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const { delivery } = await requestPasswordReset(parsed.data.email);
    if (delivery) {
      await sendResetCodeEmail(delivery.email, delivery.code);
    }
  } catch (err) {
    // Gagal kirim email pun jangan bocorkan apa-apa ke client; cukup log.
    console.error("Password reset request failed:", err);
  }

  return jsonCors({ ok: true });
}
