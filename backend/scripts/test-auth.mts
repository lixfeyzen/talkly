// Env vars loaded via `tsx --env-file=.env.local` (see package.json) --
// NOT via dotenv import here, because ESM imports are hoisted above any
// top-level code, so a dotenv call in this file would run too late (the
// db/schema imports below would already have thrown on missing env vars).
import { createUser, verifyCredentials } from "../src/lib/auth/credentials";
import { signAuthToken, verifyAuthToken } from "../src/lib/auth/jwt";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
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
  const testEmail = `test-auth-${Date.now()}@example.com`;
  const testPassword = "correct-horse-battery-staple";

  const created = await createUser(testEmail, testPassword);
  check("createUser membuat akun", created.ok === true);

  if (!created.ok) {
    throw new Error("createUser gagal, hentikan test");
  }

  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, created.user.id))
    .limit(1);

  check("password disimpan sebagai hash bcrypt ($2)", row.passwordHash.startsWith("$2"));
  check("password TIDAK disimpan plaintext", row.passwordHash !== testPassword);

  const correctLogin = await verifyCredentials(testEmail, testPassword);
  check("verifyCredentials terima password benar", correctLogin.ok === true);

  const wrongLogin = await verifyCredentials(testEmail, "salah-password");
  check("verifyCredentials tolak password salah", wrongLogin.ok === false);

  const duplicate = await createUser(testEmail, "password-lain");
  check("email duplikat ditolak", duplicate.ok === false);

  const token = signAuthToken({ userId: created.user.id, email: testEmail });
  const decoded = verifyAuthToken(token);
  check("JWT bisa ditandatangani & diverifikasi balik", decoded?.userId === created.user.id);

  const badToken = verifyAuthToken("token-palsu.tidak.valid");
  check("JWT token palsu ditolak", badToken === null);

  await db.delete(users).where(eq(users.id, created.user.id));
  console.log("\n(data test dibersihkan)");

  console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
