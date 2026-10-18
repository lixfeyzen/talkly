// Tes hapus akun (DELETE /api/auth/me) melawan Neon sungguhan, tanpa panggilan AI.
// Jalankan: npm run test:account-delete
import type { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { createUser, verifyCredentials } from "../src/lib/auth/credentials";
import { signAuthToken } from "../src/lib/auth/jwt";
import { db } from "../src/lib/db";
import { users, usageCounters } from "../src/lib/db/schema";
import { DELETE } from "../src/app/api/auth/me/route";

let pass = 0;
let fail = 0;
function check(label: string, condition: boolean) {
  if (condition) { console.log(`PASS — ${label}`); pass++; } else { console.log(`FAIL — ${label}`); fail++; }
}

function request(token: string | null, body: unknown): NextRequest {
  return new Request("http://localhost/api/auth/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function userExists(id: string) {
  return (await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)).length === 1;
}

async function main() {
  const email = `test-delete-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";
  const created = await createUser(email, password);
  if (!created.ok) throw new Error("createUser gagal");
  const login = await verifyCredentials(email, password);
  if (!login.ok) throw new Error("verifyCredentials gagal");
  const token = signAuthToken({ userId: login.user.id, email, authVersion: login.user.authVersion });

  try {
    check("tanpa token ditolak 401", (await DELETE(request(null, { password }))).status === 401);
    check("tanpa password ditolak 400", (await DELETE(request(token, {}))).status === 400);
    const wrong = await DELETE(request(token, { password: "salah-password" }));
    check("password salah ditolak 403 (bukan 401, supaya app tidak mengeluarkan user)", wrong.status === 403);
    check("password salah: akun masih ada", await userExists(created.user.id));

    const ok = await DELETE(request(token, { password }));
    check("password benar: 200", ok.status === 200);
    check("akun terhapus dari database", !(await userExists(created.user.id)));
    const counters = await db.select({ subject: usageCounters.subject }).from(usageCounters)
      .where(inArray(usageCounters.subject, [created.user.id, `user:${created.user.id}`]));
    check("penghitung kuota milik akun ikut terhapus", counters.length === 0);
    check("token lama tidak bisa menghapus lagi", (await DELETE(request(token, { password }))).status === 401);
  } finally {
    await db.delete(users).where(eq(users.id, created.user.id));
  }

  console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
