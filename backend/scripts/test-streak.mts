// Test logika streak harian terhadap DB live. Tanggal disimulasikan dengan
// meng-inject parameter `now` ("YYYY-MM-DD") -- tidak perlu menunggu hari asli.
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { recordPractice, getStreak } from "../src/lib/data/streaks";
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
  const userA = await seedUser(`streak-a-${stamp}@example.com`);
  const userB = await seedUser(`streak-b-${stamp}@example.com`);

  try {
    // Empty state: user baru belum pernah latihan.
    const empty = await getStreak(userA, "2026-07-03");
    check("EMPTY STATE: streak user baru = 0", empty.currentStreak === 0);
    check("EMPTY STATE: lastPracticeDate null", empty.lastPracticeDate === null);

    // Latihan pertama -> streak 1.
    const d1 = await recordPractice(userA, "2026-07-03");
    check("latihan pertama -> streak 1", d1.currentStreak === 1 && d1.longestStreak === 1);

    // Latihan lagi di HARI SAMA -> tetap 1 (idempoten per-hari).
    const d1b = await recordPractice(userA, "2026-07-03");
    check("latihan kedua hari sama -> tetap 1", d1b.currentStreak === 1);

    // Besoknya latihan -> streak 2.
    const d2 = await recordPractice(userA, "2026-07-04");
    check("latihan besoknya -> streak 2", d2.currentStreak === 2 && d2.longestStreak === 2);

    // Besoknya lagi -> streak 3.
    const d3 = await recordPractice(userA, "2026-07-05");
    check("hari ke-3 berturut -> streak 3", d3.currentStreak === 3);

    // getStreak di hari yang sama / besoknya (belum latihan) -> masih tampil 3.
    const view1 = await getStreak(userA, "2026-07-05");
    check("getStreak hari sama -> 3", view1.currentStreak === 3);
    const view2 = await getStreak(userA, "2026-07-06");
    check("getStreak besoknya (masih bisa lanjut) -> 3", view2.currentStreak === 3);

    // getStreak setelah bolong (2 hari lewat) -> tampil 0 walau DB belum reset.
    const view3 = await getStreak(userA, "2026-07-07");
    check("getStreak setelah bolong -> tampil 0", view3.currentStreak === 0);
    check("longestStreak tetap 3 setelah bolong", view3.longestStreak === 3);

    // Latihan lagi setelah bolong -> reset ke 1, longest tetap 3.
    const d4 = await recordPractice(userA, "2026-07-08");
    check("latihan setelah bolong -> reset ke 1", d4.currentStreak === 1);
    check("longestStreak terjaga = 3", d4.longestStreak === 3);

    // ISOLASI: streak user A tidak bocor ke user B.
    const bEmpty = await getStreak(userB, "2026-07-08");
    check("ISOLASI: user B tetap 0", bEmpty.currentStreak === 0 && bEmpty.longestStreak === 0);
    const b1 = await recordPractice(userB, "2026-07-08");
    check("ISOLASI: latihan user B -> streak 1 (bukan lanjut punya A)", b1.currentStreak === 1);
    const aAfterB = await getStreak(userA, "2026-07-08");
    check("ISOLASI: streak user A tak berubah karena aksi B", aAfterB.currentStreak === 1);
  } finally {
    // cascade delete membersihkan user_streaks via FK onDelete cascade.
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
