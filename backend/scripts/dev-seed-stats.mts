// Alat DEV: seed statistik kelemahan buat sebuah akun (uji manual fitur
// latihan terarah tanpa perlu saldo OpenAI). Pakai: npm run dev:seed-stats -- <email>
import { db } from "../src/lib/db";
import { users, userMistakeStats } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2];
if (!email) {
  console.error("Pakai: npm run dev:seed-stats -- <email>");
  process.exit(1);
}

const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
if (!u) {
  console.error(`User ${email} tidak ditemukan`);
  process.exit(1);
}

await db
  .insert(userMistakeStats)
  .values([
    { userId: u.id, category: "preposition_usage", occurrenceCount: 6 },
    { userId: u.id, category: "word_order", occurrenceCount: 2 },
  ])
  .onConflictDoNothing();
console.log(`Seeded 2 kategori kelemahan untuk ${email}`);
