// Test skenario adaptif: bagian 1 = fungsi murni suggestScenario (tanpa DB),
// bagian 2 = alur data nyata terhadap Neon live (seed stats -> saran benar).
import { db } from "../src/lib/db";
import { users, userMistakeStats, conversationSessions } from "../src/lib/db/schema";
import { suggestScenario } from "../src/lib/ai/adaptive-scenario";
import { createSession, getSessionForUser } from "../src/lib/data/conversations";
import { desc, eq } from "drizzle-orm";

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

// ===== Bagian 1: fungsi murni (tanpa DB) =====

const emptyResult = suggestScenario([]);
check("UNIT: tanpa data -> null (fallback ke skenario standar)", emptyResult === null);

const single = suggestScenario([{ category: "tense_usage", occurrenceCount: 4 }]);
check("UNIT: 1 kategori -> fokus 1 kategori itu", single?.focusCategories.length === 1 && single.focusCategories[0] === "tense_usage");
check("UNIT: skenario tense menyebut latihan yang memaksa tense", single?.scenario.includes("vacation") === true);
check("UNIT: reason menyebut jumlah kesalahan", single?.reason.includes("4×") === true);

const multi = suggestScenario([
  { category: "preposition_usage", occurrenceCount: 2 },
  { category: "verb_conjugation", occurrenceCount: 7 },
  { category: "word_order", occurrenceCount: 1 },
]);
check(
  "UNIT: kategori TERBANYAK jadi fokus utama (urutan input acak tak masalah)",
  multi?.focusCategories[0] === "verb_conjugation" && multi.focusCategories[1] === "preposition_usage",
);
check("UNIT: maksimal 2 fokus", multi?.focusCategories.length === 2);
check("UNIT: skenario ikut kategori utama (verb_conjugation)", multi?.scenario.includes("routine") === true);

const unknown = suggestScenario([
  { category: "kategori_asing_dari_masa_depan", occurrenceCount: 9 },
  { category: "article_usage", occurrenceCount: 1 },
]);
check("UNIT: kategori tak dikenal diabaikan, bukan crash", unknown?.focusCategories[0] === "article_usage");

const zeroCount = suggestScenario([{ category: "tense_usage", occurrenceCount: 0 }]);
check("UNIT: occurrenceCount 0 tidak dihitung sebagai kelemahan", zeroCount === null);

// ===== Bagian 2: alur data terhadap DB live =====

async function seedUser(email: string) {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: "x" })
    .returning({ id: users.id });
  return u.id;
}

async function main() {
  const stamp = Date.now();
  const userA = await seedUser(`adapt-a-${stamp}@example.com`);
  const userB = await seedUser(`adapt-b-${stamp}@example.com`);

  try {
    await db.insert(userMistakeStats).values([
      { userId: userA, category: "gender_agreement", occurrenceCount: 5 },
      { userId: userA, category: "tense_usage", occurrenceCount: 2 },
      { userId: userB, category: "word_order", occurrenceCount: 9 },
    ]);

    // Query yang sama seperti di endpoint /api/scenarios/suggested.
    const statsA = await db
      .select({ category: userMistakeStats.category, occurrenceCount: userMistakeStats.occurrenceCount })
      .from(userMistakeStats)
      .where(eq(userMistakeStats.userId, userA))
      .orderBy(desc(userMistakeStats.occurrenceCount))
      .limit(5);
    const suggestionA = suggestScenario(statsA);

    check("LIVE: saran user A fokus utama = gender_agreement (5x)", suggestionA?.focusCategories[0] === "gender_agreement");
    check("LIVE: saran user A fokus kedua = tense_usage", suggestionA?.focusCategories[1] === "tense_usage");
    check(
      "LIVE ISOLASI: word_order milik user B tidak nyasar ke saran user A",
      suggestionA?.focusCategories.includes("word_order") === false,
    );

    // focusCategories tersimpan di sesi & terbaca kembali (dipakai sesi lanjutan).
    const session = await createSession(userA, suggestionA!.scenario, "Spanish", suggestionA!.focusCategories);
    const reloaded = await getSessionForUser(session.id, userA);
    check(
      "LIVE: focusCategories tersimpan di sesi & terbaca kembali",
      JSON.stringify(reloaded?.focusCategories) === JSON.stringify(["gender_agreement", "tense_usage"]),
    );
    check("LIVE: sesi menyimpan skenario adaptif", reloaded?.scenario === suggestionA!.scenario);

    // Empty state: user tanpa stats -> null.
    const emptyUser = await seedUser(`adapt-empty-${stamp}@example.com`);
    const statsEmpty = await db
      .select({ category: userMistakeStats.category, occurrenceCount: userMistakeStats.occurrenceCount })
      .from(userMistakeStats)
      .where(eq(userMistakeStats.userId, emptyUser));
    check("LIVE EMPTY STATE: user baru -> saran null (bukan error)", suggestScenario(statsEmpty) === null);
    await db.delete(users).where(eq(users.id, emptyUser));
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
