// Test Interview-Day Countdown: bagian 1 = fungsi murni daysUntil/buildPlan
// (tanpa DB), bagian 2 = kolom baru di users terhadap Neon live.
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { daysUntil, buildPlan } from "../src/lib/interview-plan/plan";
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

// ===== Bagian 1: fungsi murni (tanpa DB) =====

check("UNIT: daysUntil hari sama = 0", daysUntil("2026-07-04", "2026-07-04") === 0);
check("UNIT: daysUntil besok = 1", daysUntil("2026-07-05", "2026-07-04") === 1);
check("UNIT: daysUntil kemarin = -1", daysUntil("2026-07-03", "2026-07-04") === -1);
check("UNIT: daysUntil lintas bulan", daysUntil("2026-08-03", "2026-07-04") === 30);
check("UNIT: daysUntil lintas tahun (kabisat aman)", daysUntil("2027-07-04", "2026-07-04") === 365);

const weak = [
  { category: "tense_usage", occurrenceCount: 5 },
  { category: "article_usage", occurrenceCount: 3 },
];

const past = buildPlan("2026-07-01", "2026-07-04", "General", weak);
check("UNIT: tanggal lewat -> expired", "expired" in past);

const dayH = buildPlan("2026-07-04", "2026-07-04", "General", weak);
check(
  "UNIT: hari-H -> interview_day tanpa latihan berat",
  !("expired" in dayH) && dayH.todayTask.type === "interview_day" && dayH.daysLeft === 0,
);

const h1 = buildPlan("2026-07-05", "2026-07-04", "General", weak);
check(
  "UNIT: H-1 -> review kelemahan teratas",
  !("expired" in h1) &&
    h1.todayTask.type === "review" &&
    h1.todayTask.focusCategories?.[0] === "tense_usage",
);

const h2 = buildPlan("2026-07-06", "2026-07-04", "Software Engineer", weak);
check(
  "UNIT: H-2 -> full mock, judul menyebut role",
  !("expired" in h2) &&
    h2.todayTask.type === "mock" &&
    h2.todayTask.title.includes("Software Engineer"),
);

const h3 = buildPlan("2026-07-07", "2026-07-04", "General", weak);
check("UNIT: H-3 -> full mock", !("expired" in h3) && h3.todayTask.type === "mock");

const h7 = buildPlan("2026-07-11", "2026-07-04", "General", weak);
check(
  "UNIT: H-7 -> latihan terarah pakai mesin adaptif (fokus kelemahan teratas)",
  !("expired" in h7) &&
    h7.todayTask.type === "practice" &&
    h7.todayTask.focusCategories?.[0] === "tense_usage" &&
    typeof h7.todayTask.scenario === "string",
);

const h7NoData = buildPlan("2026-07-11", "2026-07-04", "General", []);
check(
  "UNIT: H-7 user baru tanpa data -> tetap dapat tugas practice (fallback)",
  !("expired" in h7NoData) &&
    h7NoData.todayTask.type === "practice" &&
    h7NoData.todayTask.scenario === "Tell me about yourself",
);

// ===== Bagian 2: kolom baru terhadap DB live =====

async function main() {
  const stamp = Date.now();
  const email = `plan-${stamp}@example.com`;
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: "x" })
    .returning({ id: users.id });

  try {
    // Set tanggal + role (persis seperti endpoint POST /api/interview-plan).
    await db
      .update(users)
      .set({ interviewDate: "2026-07-10", interviewPlanRole: "Designer" })
      .where(eq(users.id, u.id));

    const [row] = await db
      .select({ interviewDate: users.interviewDate, role: users.interviewPlanRole })
      .from(users)
      .where(eq(users.id, u.id))
      .limit(1);

    check("DB: kolom interview_date tersimpan & terbaca", row?.interviewDate === "2026-07-10");
    check("DB: kolom interview_plan_role tersimpan & terbaca", row?.role === "Designer");

    // Clear (persis seperti endpoint DELETE).
    await db
      .update(users)
      .set({ interviewDate: null, interviewPlanRole: null })
      .where(eq(users.id, u.id));
    const [cleared] = await db
      .select({ interviewDate: users.interviewDate })
      .from(users)
      .where(eq(users.id, u.id))
      .limit(1);
    check("DB: clear mengosongkan kolom", cleared?.interviewDate === null);
  } finally {
    await db.delete(users).where(eq(users.id, u.id));
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
