// Pengiriman kode reset password ke email user.
//
// Produksi: pakai Resend (https://resend.com) -- set RESEND_API_KEY +
// EMAIL_FROM (alamat pengirim dari domain terverifikasi) di env.
// Tanpa RESEND_API_KEY: mode DEV -- kode dicetak ke console server dengan
// label jelas, supaya alur tetap bisa diuji end-to-end tanpa akun email.
// Ini fallback dev yang eksplisit, BUKAN pura-pura terkirim.

const RESEND_TIMEOUT_MS = 10_000;

export async function sendResetCodeEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("Password reset email is not configured");
    console.warn(
      `[DEV EMAIL FALLBACK] RESEND_API_KEY belum di-set. Kode reset untuk ${to}: ${code} (berlaku 15 menit)`,
    );
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.EMAIL_FROM) {
    throw new Error("Password reset sender is not configured");
  }
  const from = process.env.EMAIL_FROM ?? "Talkly <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Talkly password reset code",
      text: [
        `Your Talkly password reset code: ${code}`,
        "",
        "Enter this code in the app within 15 minutes.",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Password reset email provider failed (${res.status})`);
  }
}
