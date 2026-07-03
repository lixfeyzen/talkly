// Hapus user throwaway yang dibuat saat tes e2e/CORS manual. Semua email
// domain "@example.com" (domain khusus testing per RFC 2606 -- user asli tak
// mungkin pakai) dianggap data test. Aman diulang. Cascade FK ikut
// membersihkan sesi/kesalahan/stats milik user tsb.
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

const result = await db
  .delete(users)
  .where(sql`${users.email} LIKE '%@example.com'`)
  .returning({ email: users.email });

console.log(`Dihapus ${result.length} user test:`);
for (const u of result) console.log(`  - ${u.email}`);
