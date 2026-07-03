// Test forgot-password terhadap DB live. Waktu disimulasikan via param `now`
// (cooldown & kedaluwarsa tidak perlu menunggu sungguhan).
import { db } from "../src/lib/db";
import { users, passwordResetCodes } from "../src/lib/db/schema";
import { requestPasswordReset, resetPassword } from "../src/lib/auth/password-reset";
import { createUser, verifyCredentials } from "../src/lib/auth/credentials";
import { eq } from "drizzle-orm";

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`PASS — ${label}`);
    pass++;
  } else {
    console.log(`FAIL — ${label}`);
    fail++;
  }
}

async function main() {
  const stamp = Date.now();
  const email = `reset-${stamp}@example.com`;
  const oldPassword = "PasswordLama123";
  const newPassword = "PasswordBaru456";

  const created = await createUser(email, oldPassword);
  if (!created.ok) throw new Error("gagal bikin user test");
  const userId = created.user.id;

  const t0 = new Date();
  const later = (ms: number) => new Date(t0.getTime() + ms);

  try {
    // 1. Email tak terdaftar -> diam-diam null (anti enumeration), tanpa throw.
    const unknown = await requestPasswordReset(`ghost-${stamp}@example.com`, t0);
    check("ANTI-ENUM: email tak terdaftar -> delivery null, tanpa error", unknown.delivery === null);

    // 2. Email terdaftar -> kode 6 digit.
    const first = await requestPasswordReset(email, t0);
    check("request kode -> dapat kode 6 digit", /^\d{6}$/.test(first.delivery?.code ?? ""));
    check("kode dikirim ke email yang benar", first.delivery?.email === email);

    // 3. Kode di DB = HASH, bukan kode mentah.
    const [row] = await db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.userId, userId));
    check("DB menyimpan hash (bukan kode mentah)", row.codeHash !== first.delivery!.code && row.codeHash.length === 64);

    // 4. Cooldown: minta lagi <60 dtk -> tidak bikin kode baru.
    const spam = await requestPasswordReset(email, later(30_000));
    check("COOLDOWN: minta ulang <1 menit -> tidak ada kode baru", spam.delivery === null);

    // 5. Kode salah -> invalid_or_expired + attempts bertambah.
    const wrong = await resetPassword(email, "000000", newPassword, later(60_000));
    check("kode salah -> invalid_or_expired", !wrong.ok && wrong.reason === "invalid_or_expired");
    const [afterWrong] = await db
      .select({ attempts: passwordResetCodes.attempts })
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.userId, userId));
    check("attempts tercatat di DB", afterWrong.attempts === 1);

    // 6. Brute force: total 5 percobaan salah -> terkunci walau kode BENAR.
    for (let i = 0; i < 4; i++) {
      await resetPassword(email, "111111", newPassword, later(61_000));
    }
    const locked = await resetPassword(email, first.delivery!.code, newPassword, later(62_000));
    check("BRUTE-FORCE: 5x salah -> kode benar pun ditolak (too_many_attempts)", !locked.ok && locked.reason === "too_many_attempts");

    // 7. Minta kode BARU setelah cooldown -> kode lama terhapus, dapat kode baru.
    const second = await requestPasswordReset(email, later(70_000));
    check("setelah terkunci bisa minta kode baru (lewat cooldown)", /^\d{6}$/.test(second.delivery?.code ?? ""));

    // 8. Kode benar -> password berganti.
    const ok = await resetPassword(email, second.delivery!.code, newPassword, later(80_000));
    check("kode benar -> reset sukses", ok.ok === true);
    const oldLogin = await verifyCredentials(email, oldPassword);
    check("password LAMA ditolak setelah reset", oldLogin.ok === false);
    const newLogin = await verifyCredentials(email, newPassword);
    check("password BARU diterima setelah reset", newLogin.ok === true);

    // 9. SINGLE-USE: kode yang sama tidak bisa dipakai lagi.
    const reuse = await resetPassword(email, second.delivery!.code, "PasswordLain789", later(90_000));
    check("SINGLE-USE: kode terpakai ditolak", !reuse.ok && reuse.reason === "invalid_or_expired");
    const stillNew = await verifyCredentials(email, newPassword);
    check("password tidak berubah oleh percobaan reuse", stillNew.ok === true);

    // 10. KEDALUWARSA: kode baru tapi dipakai >15 menit kemudian -> ditolak.
    const third = await requestPasswordReset(email, later(200_000));
    const expired = await resetPassword(email, third.delivery!.code, "PasswordExp000", later(200_000 + 16 * 60_000));
    check("EXPIRY: kode >15 menit -> invalid_or_expired", !expired.ok && expired.reason === "invalid_or_expired");
  } finally {
    await db.delete(users).where(eq(users.id, userId)); // cascade hapus kode
    console.log("\n(data test dibersihkan)");
  }

  console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
