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
    console.warn(
      `[DEV EMAIL FALLBACK] RESEND_API_KEY belum di-set. Kode reset untuk ${to}: ${code} (berlaku 15 menit)`,
    );
    return;
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
      subject: `${code} kode reset password Talkly`,
      text: [
        `Kode reset password Talkly kamu: ${code}`,
        "",
        "Masukkan kode ini di aplikasi. Berlaku 15 menit.",
        "Kalau kamu tidak meminta reset password, abaikan email ini.",
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API failed (${res.status}): ${body.slice(0, 300)}`);
  }
}
