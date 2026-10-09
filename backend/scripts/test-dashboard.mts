// Test data layer dashboard terhadap DB live. Bikin 2 user + data sesi/kesalahan,
// verifikasi agregasi benar DAN terisolasi per-user, lalu bersihkan.
import { db } from "../src/lib/db";
import { users, conversationSessions, mistakePatterns, userMistakeStats } from "../src/lib/db/schema";
import { getDashboardData } from "../src/lib/data/dashboard";
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

async function seedUser(email: string) {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: "x" })
    .returning({ id: users.id });
  return u.id;
}

async function main() {
  const stamp = Date.now();
  const userA = await seedUser(`dash-a-${stamp}@example.com`);
  const userB = await seedUser(`dash-b-${stamp}@example.com`);

  try {
    // User A: 2 sesi, 3 kesalahan (2x verb_conjugation, 1x preposition_usage).
    const [sessA1] = await db
      .insert(conversationSessions)
      .values({ userId: userA, scenario: "pesan kopi", targetLanguage: "Spanish", transcript: [] })
      .returning({ id: conversationSessions.id });
    await db
      .insert(conversationSessions)
      .values({ userId: userA, scenario: "tanya arah", targetLanguage: "Spanish", transcript: [] });

    await db.insert(mistakePatterns).values([
      { userId: userA, sessionId: sessA1.id, category: "verb_conjugation", originalText: "yo tener", correctedText: "yo tengo" },
      { userId: userA, sessionId: sessA1.id, category: "verb_conjugation", originalText: "el comer", correctedText: "el come" },
      { userId: userA, sessionId: sessA1.id, category: "preposition_usage", originalText: "voy a casa de", correctedText: "voy a casa" },
    ]);
    await db.insert(userMistakeStats).values([
      { userId: userA, category: "verb_conjugation", occurrenceCount: 2 },
      { userId: userA, category: "preposition_usage", occurrenceCount: 1 },
    ]);

    // User B: 1 sesi, 1 kesalahan berbeda -- buat cek isolasi.
    const [sessB1] = await db
      .insert(conversationSessions)
      .values({ userId: userB, scenario: "interview kerja", targetLanguage: "French", transcript: [] })
      .returning({ id: conversationSessions.id });
    await db.insert(mistakePatterns).values({
      userId: userB, sessionId: sessB1.id, category: "gender_agreement", originalText: "le maison", correctedText: "la maison",
    });
    await db.insert(userMistakeStats).values({ userId: userB, category: "gender_agreement", occurrenceCount: 1 });

    // The DB clock can run ahead of this machine (measured +1.3 s, 2026-10-10); a one-minute horizon keeps
    // rows inserted just now inside the recent window.
    const asOf = new Date(Date.now() + 60_000);
    const dashA = await getDashboardData(userA, asOf);

    check("totalSessions user A = 2", dashA.activity.totalSessions === 2);
    check("totalCorrections user A = 3", dashA.activity.totalCorrections === 3);
    check("lastPracticedAt user A terisi", dashA.activity.lastPracticedAt !== null);
    check(
      "top weakness user A = verb_conjugation (2x) di urutan pertama",
      dashA.topWeaknesses[0]?.category === "verb_conjugation" && dashA.topWeaknesses[0]?.occurrenceCount === 2,
    );
    check("user A punya 2 kategori kelemahan", dashA.topWeaknesses.length === 2);
    check(
      "ISOLASI: user A TIDAK lihat kelemahan user B (gender_agreement)",
      !dashA.topWeaknesses.some((w) => w.category === "gender_agreement"),
    );
    check("recentCorrections user A = 3", dashA.recentCorrections.length === 3);
    check(
      "ISOLASI: recentCorrections user A tidak memuat data user B",
      !dashA.recentCorrections.some((c) => c.originalText === "le maison"),
    );

    const dashB = await getDashboardData(userB, asOf);
    check("user B totalSessions = 1 (bukan 3)", dashB.activity.totalSessions === 1);
    check("user B totalCorrections = 1 (bukan 4)", dashB.activity.totalCorrections === 1);

    // Empty state: user baru tanpa data apa pun.
    const emptyUser = await seedUser(`dash-empty-${stamp}@example.com`);
    const dashEmpty = await getDashboardData(emptyUser, asOf);
    check("EMPTY STATE: user baru totalSessions = 0", dashEmpty.activity.totalSessions === 0);
    check("EMPTY STATE: topWeaknesses kosong (bukan error)", dashEmpty.topWeaknesses.length === 0);
    check("EMPTY STATE: lastPracticedAt null", dashEmpty.activity.lastPracticedAt === null);

    await db.delete(users).where(eq(users.id, emptyUser));
  } finally {
    // cascade delete akan bersihkan sesi/kesalahan/stats via FK onDelete cascade.
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
