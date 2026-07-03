// Hapus user throwaway yang dibuat saat tes e2e manual (pola email
// mengandung "-e2e-" atau "e2e-test-"). Aman diulang. Cascade FK ikut
// membersihkan sesi/kesalahan/stats milik user tsb.
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

const result = await db
  .delete(users)
  .where(sql`${users.email} LIKE '%e2e%@example.com' OR ${users.email} LIKE 'dash-e2e-%'`)
  .returning({ email: users.email });

console.log(`Dihapus ${result.length} user test:`);
for (const u of result) console.log(`  - ${u.email}`);
