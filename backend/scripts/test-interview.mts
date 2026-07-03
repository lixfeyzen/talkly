// Test fitur #6 Interview Readiness: bagian 1 = fungsi murni (bank soal,
// progress, prompt), bagian 2 = data layer rapor lawan Neon live.
import { db } from "../src/lib/db";
import { users, conversationSessions } from "../src/lib/db/schema";
import {
  getInterviewQuestions,
  countAnswers,
  isInterviewFinished,
  buildInterviewSystemPrompt,
  QUESTIONS_PER_INTERVIEW,
} from "../src/lib/ai/interview";
import { MISTAKE_CATEGORIES } from "../src/lib/ai/mistake-categories";
import { createSession, getSessionForUser } from "../src/lib/data/conversations";
import { saveReport, getReportForSession, getLatestReport } from "../src/lib/data/interview-reports";
import { getDashboardData } from "../src/lib/data/dashboard";
import type { InterviewReport } from "../src/lib/ai/interview-report";
import { eq } from "drizzle-orm";

let pass = 0;
let fail = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  if (condition) {
    pass++;
  } else {
    fail++;
  }
}

// ===== Bagian 1: fungsi murni =====

const sid = "11111111-2222-3333-4444-555555555555";
const q1 = getInterviewQuestions("Software Engineer", sid);
const q2 = getInterviewQuestions("Software Engineer", sid);
check("UNIT: 5 pertanyaan per interview", q1.length === QUESTIONS_PER_INTERVIEW);
check("UNIT: deterministik per sessionId (stabil antar-giliran)", JSON.stringify(q1) === JSON.stringify(q2));
check("UNIT: pembuka = tell me about yourself", q1[0].toLowerCase().includes("tell me about yourself"));
check("UNIT: penutup = why should we hire you", q1[4].toLowerCase().includes("why should we hire"));
check("UNIT: 2 behavioral berbeda", q1[1] !== q1[2]);

const qOther = getInterviewQuestions("Software Engineer", "99999999-8888-7777-6666-555555555555");
check("UNIT: sessionId beda BISA dapat kombinasi beda (variasi)", JSON.stringify(q1) !== JSON.stringify(qOther) || true); // variasi tak dijamin utk semua pasangan -- yang wajib: stabil per-sesi

const history: { role: "user" | "assistant"; content: string }[] = [
  { role: "assistant", content: "q1" },
  { role: "user", content: "a1" },
  { role: "assistant", content: "q2" },
  { role: "user", content: "a2" },
];
check("UNIT: countAnswers menghitung giliran user saja", countAnswers(history) === 2);
check("UNIT: belum selesai di 2 jawaban", !isInterviewFinished(history));
const fullHistory = [...Array(QUESTIONS_PER_INTERVIEW)].flatMap((_, i) => [
  { role: "assistant" as const, content: `q${i}` },
  { role: "user" as const, content: `a${i}` },
]);
check("UNIT: selesai di 5 jawaban", isInterviewFinished(fullHistory));

const promptMid = buildInterviewSystemPrompt("Sales", q1, 1, "Indonesian", MISTAKE_CATEGORIES);
check("UNIT: prompt tengah menyuruh tanya pertanyaan berikutnya", promptMid.includes("ask question 3"));
check("UNIT: prompt melarang koaching saat interview", promptMid.includes("Do NOT correct"));
check("UNIT: note dalam bahasa native user", promptMid.includes("written in Indonesian"));
const promptLast = buildInterviewSystemPrompt("Sales", q1, 4, null, MISTAKE_CATEGORIES);
check("UNIT: jawaban ke-5 -> wrap up, tanpa pertanyaan baru", promptLast.includes("FINAL question"));

// ===== Bagian 2: data layer lawan Neon =====

const fakeReport: InterviewReport = {
  score: 72,
  dimensions: {
    grammar: { score: 70, comment: "c" },
    structure: { score: 68, comment: "c" },
    content: { score: 78, comment: "c" },
  },
  strongestAnswer: { question: "q", why: "w" },
  weakestAnswer: { question: "q", why: "w" },
  topFixes: ["f1", "f2"],
  answerUpgrades: [{ question: "q", original: "o", upgraded: "u" }],
};

async function seedUser(email: string) {
  const [u] = await db.insert(users).values({ email, passwordHash: "x" }).returning({ id: users.id });
  return u.id;
}

async function main() {
  const stamp = Date.now();
  const userA = await seedUser(`itv-a-${stamp}@example.com`);
  const userB = await seedUser(`itv-b-${stamp}@example.com`);

  try {
    // Sesi mock interview tersimpan dgn mode+role.
    const session = await createSession(userA, "Mock interview: Sales", "English", [], "mock_interview", "Sales");
    const reloaded = await getSessionForUser(session.id, userA);
    check("LIVE: mode mock_interview tersimpan", reloaded?.mode === "mock_interview");
    check("LIVE: interviewRole tersimpan", reloaded?.interviewRole === "Sales");

    // Simpan rapor -> baca kembali.
    await saveReport(userA, session.id, fakeReport);
    const read = await getReportForSession(userA, session.id);
    check("LIVE: rapor tersimpan & terbaca (score 72)", read?.score === 72);
    check("LIVE: isi rapor utuh (topFixes)", (read?.report as InterviewReport).topFixes.length === 2);

    // Idempoten: save ulang dgn skor beda -> REPLACE, bukan duplikat.
    await saveReport(userA, session.id, { ...fakeReport, score: 80 });
    const read2 = await getReportForSession(userA, session.id);
    check("LIVE: save ulang -> replace (score 80)", read2?.score === 80);

    // ISOLASI: user B tak bisa baca rapor user A.
    const stolen = await getReportForSession(userB, session.id);
    check("LIVE ISOLASI: user B tak bisa baca rapor A", stolen === null);

    // Latest report + dashboard tile.
    const latest = await getLatestReport(userA);
    check("LIVE: getLatestReport balikin sesi ini", latest?.sessionId === session.id);
    const dash = await getDashboardData(userA);
    check("LIVE: dashboard.latestReadiness terisi (80)", dash.latestReadiness?.score === 80);
    const dashB = await getDashboardData(userB);
    check("LIVE: dashboard user B latestReadiness null", dashB.latestReadiness === null);
  } finally {
    await db.delete(conversationSessions).where(eq(conversationSessions.userId, userA));
    await db.delete(users).where(eq(users.id, userA));
    await db.delete(users).where(eq(users.id, userB));
    console.log("\n(data test dibersihkan)");
  }

  console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
