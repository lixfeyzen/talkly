// Test data layer riwayat percakapan terhadap DB live. Bikin 2 user + sesi,
// verifikasi daftar (urutan terbaru dulu, hitung pesan, cuplikan terakhir),
// isolasi antar-user, empty-state, dan detail (kepemilikan + not-found), lalu bersihkan.
import { db } from "../src/lib/db";
import { users, conversationSessions } from "../src/lib/db/schema";
import { listSessionsForUser, getSessionForUser } from "../src/lib/data/conversations";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

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
  const userA = await seedUser(`hist-a-${stamp}@example.com`);
  const userB = await seedUser(`hist-b-${stamp}@example.com`);

  try {
    // User A: 3 sesi dengan createdAt eksplisit (urutan pasti: old -> mid -> new).
    const t0 = new Date("2026-01-01T10:00:00Z");
    const t1 = new Date("2026-01-02T10:00:00Z");
    const t2 = new Date("2026-01-03T10:00:00Z");

    // Sesi tertua: free chat, 2 pesan.
    await db.insert(conversationSessions).values({
      userId: userA,
      scenario: "Order a coffee",
      targetLanguage: "English",
      transcript: [
        { role: "user", content: "Hi, can I get a latte?" },
        { role: "assistant", content: "Sure, what size would you like?" },
      ],
      mode: "free",
      createdAt: t0,
    });

    // Sesi tengah: mock interview, 3 pesan, punya interviewRole.
    const [midSession] = await db
      .insert(conversationSessions)
      .values({
        userId: userA,
        scenario: "Job interview",
        targetLanguage: "English",
        transcript: [
          { role: "assistant", content: "Tell me about yourself." },
          { role: "user", content: "I am a software engineer." },
          { role: "assistant", content: "Great, what are your strengths?" },
        ],
        mode: "mock_interview",
        interviewRole: "Software Engineer",
        createdAt: t1,
      })
      .returning({ id: conversationSessions.id });

    // Sesi terbaru: free chat, transkrip kosong (edge: belum ada pesan).
    await db.insert(conversationSessions).values({
      userId: userA,
      scenario: "Small talk",
      targetLanguage: "English",
      transcript: [],
      mode: "free",
      createdAt: t2,
    });

    // User B: 1 sesi -- untuk cek isolasi.
    const [sessB] = await db
      .insert(conversationSessions)
      .values({
        userId: userB,
        scenario: "Networking event",
        targetLanguage: "English",
        transcript: [{ role: "user", content: "secret-of-user-B" }],
        mode: "free",
        createdAt: t1,
      })
      .returning({ id: conversationSessions.id });

    // === LIST ===
    const listA = await listSessionsForUser(userA);
    check("list user A = 3 sesi", listA.length === 3);
    check(
      "urutan TERBARU dulu (Small talk -> Job interview -> Order a coffee)",
      listA[0]?.scenario === "Small talk" &&
        listA[1]?.scenario === "Job interview" &&
        listA[2]?.scenario === "Order a coffee",
    );
    check("messageCount benar (0, 3, 2)", listA[0]?.messageCount === 0 && listA[1]?.messageCount === 3 && listA[2]?.messageCount === 2);
    check(
      "lastMessage = pesan terakhir sesi (coffee -> 'Sure...')",
      listA[2]?.lastMessage === "Sure, what size would you like?",
    );
    check("lastMessage sesi kosong = null", listA[0]?.lastMessage === null);
    check(
      "mode + interviewRole ikut (mock_interview / Software Engineer)",
      listA[1]?.mode === "mock_interview" && listA[1]?.interviewRole === "Software Engineer",
    );
    check(
      "ISOLASI: user A tidak memuat sesi user B",
      !listA.some((s) => s.scenario === "Networking event"),
    );

    // Empty state: user baru tanpa sesi.
    const emptyUser = await seedUser(`hist-empty-${stamp}@example.com`);
    const listEmpty = await listSessionsForUser(emptyUser);
    check("EMPTY STATE: user baru list = [] (bukan error)", listEmpty.length === 0);

    // === DETAIL ===
    const detail = await getSessionForUser(midSession.id, userA);
    check("detail: pemilik dapat sesinya", detail?.id === midSession.id);
    check(
      "detail: transkrip penuh utuh (3 pesan)",
      Array.isArray(detail?.transcript) && (detail?.transcript as unknown[]).length === 3,
    );

    // Kepemilikan: user A TIDAK bisa baca sesi user B.
    const stolen = await getSessionForUser(sessB.id, userA);
    check("KEPEMILIKAN: user A tak bisa baca sesi user B (null)", stolen === null);

    // Not found: UUID acak yang tidak ada.
    const missing = await getSessionForUser(randomUUID(), userA);
    check("NOT FOUND: sessionId acak -> null", missing === null);

    await db.delete(users).where(eq(users.id, emptyUser));
  } finally {
    // cascade delete membersihkan sesi via FK onDelete cascade.
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
