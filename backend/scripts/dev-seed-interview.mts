// Alat DEV: seed sesi interview (selesai/belum/free) buat uji guard HTTP
// tanpa AI. Pakai: npm run dev:seed-interview -- <email>
import { db } from "../src/lib/db";
import { users, conversationSessions } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2];
if (!email) {
  console.error("Pakai: npm run dev:seed-interview -- <email>");
  process.exit(1);
}
const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
if (!u) {
  console.error(`User ${email} tidak ditemukan`);
  process.exit(1);
}

const fullTranscript = [...Array(5)].flatMap((_, i) => [
  { role: "assistant", content: `Question ${i + 1}?` },
  { role: "user", content: `My answer number ${i + 1}.` },
]);
const partialTranscript = fullTranscript.slice(0, 4); // 2 jawaban

const [finished] = await db
  .insert(conversationSessions)
  .values({ userId: u.id, scenario: "Mock interview: Sales", targetLanguage: "English", transcript: fullTranscript, mode: "mock_interview", interviewRole: "Sales" })
  .returning({ id: conversationSessions.id });
const [unfinished] = await db
  .insert(conversationSessions)
  .values({ userId: u.id, scenario: "Mock interview: Sales", targetLanguage: "English", transcript: partialTranscript, mode: "mock_interview", interviewRole: "Sales" })
  .returning({ id: conversationSessions.id });
const [free] = await db
  .insert(conversationSessions)
  .values({ userId: u.id, scenario: "Job interview", targetLanguage: "English", transcript: fullTranscript, mode: "free" })
  .returning({ id: conversationSessions.id });

console.log(`FINISHED=${finished.id}`);
console.log(`UNFINISHED=${unfinished.id}`);
console.log(`FREE=${free.id}`);
