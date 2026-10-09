// Alat DEV: seed sesi interview (selesai/belum/free) buat uji guard HTTP
// tanpa AI. Pakai: npm run dev:seed-interview -- <email>
import { db } from "../src/lib/db";
import { users, conversationSessions } from "../src/lib/db/schema";
import { saveReport } from "../src/lib/data/interview-reports";
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

// Rapor contoh utk sesi selesai -- verifikasi layar report tanpa AI.
await saveReport(u.id, finished.id, {
  score: 68,
  dimensions: {
    grammar: { score: 62, comment: "Beberapa kesalahan tense saat bercerita tentang pengalaman kerja." },
    structure: { score: 65, comment: "Jawaban cenderung melompat-lompat; struktur STAR belum konsisten." },
    content: { score: 76, comment: "Contoh proyekmu kuat dan relevan dengan role yang dilamar." },
    confidence: { score: 60, comment: "Coba mulai jawaban dengan 'Saya' bukan 'Mungkin' atau 'Bisa saja'." },
  },
  strongestAnswer: {
    question: "Walk me through how you would handle a customer who says the price is too high.",
    why: "Kamu memberi langkah konkret dan tetap tenang -- persis yang dicari interviewer.",
  },
  weakestAnswer: {
    question: "Tell me about yourself and your background.",
    why: "Terlalu umum dan tidak menyebut pencapaian spesifik.",
  },
  topFixes: [
    "Latih past tense untuk menceritakan pengalaman (worked, led, built).",
    "Mulai jawaban dengan 1 kalimat rangkuman, baru detail.",
    "Siapkan 2 angka pencapaian yang bisa disebut cepat.",
  ],
  answerUpgrades: [
    {
      question: "Tell me about yourself and your background.",
      original: "I am fresh graduate and I like sales.",
      upgraded:
        "I'm a recent graduate with a strong interest in sales -- during my internship I handled 30+ customer conversations a week and consistently hit my weekly targets.",
    },
  ],
});
console.log(`FINISHED=${finished.id}`);
console.log(`UNFINISHED=${unfinished.id}`);
console.log(`FREE=${free.id}`);
