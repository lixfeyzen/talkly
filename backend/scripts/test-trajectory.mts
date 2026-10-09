// Test Readiness Trajectory: bagian 1 = fungsi murni buildTrajectory (tanpa
// DB), bagian 2 = alur data nyata terhadap Neon live (seed rapor + kesalahan
// -> agregat benar).
import { db } from "../src/lib/db";
import {
  users,
  conversationSessions,
  interviewReports,
  mistakePatterns,
} from "../src/lib/db/schema";
import { buildTrajectory } from "../src/lib/trajectory/trajectory";
import { categoryLabel } from "../src/lib/ai/adaptive-scenario";
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

const NOW = new Date("2026-07-04T12:00:00Z");
const comparable = { role: "General", rubricVersion: "practice-v1" };
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// ===== Bagian 1: fungsi murni (tanpa DB) =====

const empty = buildTrajectory([], [], NOW);
check("UNIT: user baru -> struktur kosong + insight ajakan (bukan crash)",
  empty.scores.length === 0 && empty.trends.length === 0 && empty.insight.includes("starts here"));

const oneScore = buildTrajectory([{ ...comparable, score: 61, createdAt: daysAgo(2) }], [], NOW);
check("UNIT: 1 rapor -> insight ajak mock kedua, sebut skornya",
  oneScore.scores.length === 1 && oneScore.insight.includes("61"));

const up = buildTrajectory(
  [
    { ...comparable, score: 52, createdAt: daysAgo(21) },
    { ...comparable, score: 60, createdAt: daysAgo(10) },
    { ...comparable, score: 74, createdAt: daysAgo(1) },
  ],
  [],
  NOW,
);
check("UNIT: skor urut kronologis walau input acak dites terpisah",
  up.scores[0].score === 52 && up.scores[2].score === 74);
check("UNIT: skor naik -> insight 'up 22 points'", up.insight.includes("up 22 points"));

const down = buildTrajectory(
  [
    { ...comparable, score: 70, createdAt: daysAgo(20) },
    { ...comparable, score: 65, createdAt: daysAgo(1) },
  ],
  [],
  NOW,
);
check("UNIT: skor turun -> insight jujur tapi menyemangati (tanpa 'up')",
  down.insight.includes("below") && !down.insight.includes("up "));

const mistakes = [
  // tense_usage: 10 di jendela lama, 4 di jendela baru -> -60%
  ...Array.from({ length: 10 }, (_, i) => ({ category: "tense_usage", createdAt: daysAgo(16 + (i % 10)) })),
  ...Array.from({ length: 4 }, () => ({ category: "tense_usage", createdAt: daysAgo(3) })),
  // article_usage: 2 lama, 3 baru -> +50%
  ...Array.from({ length: 2 }, () => ({ category: "article_usage", createdAt: daysAgo(20) })),
  ...Array.from({ length: 3 }, () => ({ category: "article_usage", createdAt: daysAgo(5) })),
  // word_order: hanya baru -> changePct null
  ...Array.from({ length: 2 }, () => ({ category: "word_order", createdAt: daysAgo(1) })),
  // di luar kedua jendela (40 hari lalu) -> diabaikan
  ...Array.from({ length: 9 }, () => ({ category: "plural_agreement", createdAt: daysAgo(40) })),
];
const tr = buildTrajectory([], mistakes, NOW, categoryLabel);
const tense = tr.trends.find((t) => t.category === "tense_usage");
const article = tr.trends.find((t) => t.category === "article_usage");
const word = tr.trends.find((t) => t.category === "word_order");
check("UNIT: jumlah catatan turun dihitung benar (10->4 = -60%)", tense?.changePct === -60);
check("UNIT: jumlah catatan naik dihitung benar (2->3 = +50%)", article?.changePct === 50);
check("UNIT: kategori baru tanpa pembanding -> changePct null", word?.changePct === null);
check("UNIT: data di luar 2 jendela diabaikan",
  tr.trends.every((t) => t.category !== "plural_agreement"));
check("UNIT: tanpa rapor -> sebut jumlah catatan dan batas maknanya",
  tr.insight.includes("tense usage") && tr.insight.includes("cannot establish improvement"));

// ===== Bagian 2: alur data terhadap DB live =====

async function main() {
  const stamp = Date.now();
  const [u] = await db
    .insert(users)
    .values({ email: `traj-${stamp}@example.com`, passwordHash: "x" })
    .returning({ id: users.id });

  try {
    const [s1] = await db
      .insert(conversationSessions)
      .values({ userId: u.id, scenario: "Mock interview: General", targetLanguage: "English", mode: "mock_interview", interviewRole: "General" })
      .returning({ id: conversationSessions.id });
    const [s2] = await db
      .insert(conversationSessions)
      .values({ userId: u.id, scenario: "Mock interview: General", targetLanguage: "English", mode: "mock_interview", interviewRole: "General" })
      .returning({ id: conversationSessions.id });

    await db.insert(interviewReports).values([
      { userId: u.id, sessionId: s1.id, score: 55, report: {rubricVersion: "practice-v1"}, createdAt: daysAgo(15) },
      { userId: u.id, sessionId: s2.id, score: 72, report: {rubricVersion: "practice-v1"}, createdAt: daysAgo(2) },
    ]);
    await db.insert(mistakePatterns).values([
      { userId: u.id, sessionId: s1.id, category: "tense_usage", originalText: "a", correctedText: "b", createdAt: daysAgo(20) },
      { userId: u.id, sessionId: s1.id, category: "tense_usage", originalText: "c", correctedText: "d", createdAt: daysAgo(18) },
      { userId: u.id, sessionId: s2.id, category: "tense_usage", originalText: "e", correctedText: "f", createdAt: daysAgo(3) },
    ]);

    // Query yang sama seperti endpoint GET /api/trajectory.
    const reports = await db
      .select({ score: interviewReports.score, createdAt: interviewReports.createdAt })
      .from(interviewReports)
      .where(eq(interviewReports.userId, u.id));
    const mrows = await db
      .select({ category: mistakePatterns.category, createdAt: mistakePatterns.createdAt })
      .from(mistakePatterns)
      .where(eq(mistakePatterns.userId, u.id));

    const live = buildTrajectory(reports.map(r => ({...r, ...comparable})), mrows, NOW, categoryLabel);
    check("DB: 2 skor terbaca urut & benar", live.scores.length === 2 && live.scores[0].score === 55 && live.scores[1].score === 72);
    check("DB: insight gabungan skor naik + tren membaik",
      live.insight.includes("up 17 points") && live.insight.includes("tense usage"));
    check("DB: tren tense 2->1 = -50%", live.trends[0]?.changePct === -50);
  } finally {
    await db.delete(users).where(eq(users.id, u.id)); // cascade bersihkan sisanya
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
