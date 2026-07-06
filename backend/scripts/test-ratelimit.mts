// Test rate limiter (consumeQuota) lawan DB live. Waktu diinjeksi (pola
// streak) — tak perlu menunggu menit/hari nyata. Jalankan: npm run test:ratelimit
import { like } from "drizzle-orm";
import { db } from "../src/lib/db";
import { usageCounters } from "../src/lib/db/schema";
import { consumeQuota } from "../src/lib/rate-limit";

const stamp = Date.now();
const A = `rl-a-${stamp}`; // subjek register uji
const B = `rl-b-${stamp}`; // subjek isolasi
const C = `rl-c-${stamp}`; // subjek ai uji

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) {
    pass++;
    console.log("PASS —", name);
  } else {
    fail++;
    console.log("FAIL —", name);
  }
};

// Waktu sintetis (2030) supaya bucket tak mungkin bentrok trafik nyata.
const base = new Date("2030-01-15T10:00:30.000Z");
const atMinute = (m: number) => new Date(base.getTime() + m * 60_000);

// ── register: 5/menit ──
let lastDenied: Awaited<ReturnType<typeof consumeQuota>> | null = null;
let allowedCount = 0;
for (let i = 0; i < 6; i++) {
  const r = await consumeQuota(A, "register", base);
  if (r.allowed) allowedCount++;
  else lastDenied = r;
}
check("register: 5 pertama lolos", allowedCount === 5);
check(
  "register: ke-6 ditolak scope minute + retryAfter benar (30s)",
  lastDenied !== null && !lastDenied.allowed && lastDenied.scope === "minute" && lastDenied.retryAfterSec === 30,
);

// ── isolasi antar-subject: B tak terpengaruh spam A ──
const rb = await consumeQuota(B, "register", base);
check("isolasi: subject lain tetap lolos di menit sama", rb.allowed);

// ── register: 20/hari (lintasi menit-menit berbeda) ──
// A sudah memakai 5 jatah harian di menit-0; tambah 15 lagi = 20.
let dayAllowed = 0;
for (let m = 1; m <= 3; m++) {
  for (let i = 0; i < 5; i++) {
    const r = await consumeQuota(A, "register", atMinute(m));
    if (r.allowed) dayAllowed++;
  }
}
check("register: sisa jatah harian (15) terpakai penuh", dayAllowed === 15);
const rDay = await consumeQuota(A, "register", atMinute(4));
check(
  "register: ke-21 ditolak scope day",
  !rDay.allowed && !rDay.allowed === true && (rDay as { scope?: string }).scope === "day",
);

// ── ai: 12/menit ──
let aiAllowed = 0;
let aiDenied: { scope?: string } | null = null;
for (let i = 0; i < 13; i++) {
  const r = await consumeQuota(C, "ai", base);
  if (r.allowed) aiAllowed++;
  else aiDenied = r;
}
check("ai: 12 pertama lolos, ke-13 ditolak scope minute", aiAllowed === 12 && aiDenied?.scope === "minute");

// ── denied TIDAK menghanguskan jatah harian ──
// A di menit-0 ditolak 1x (percobaan ke-6) — day count A harus tepat 20, bukan 21.
// (sudah terbukti implisit: ke-21 ditolak day; kalau denied ikut menghitung,
// penolakan day terjadi lebih awal dan cek "15 terpakai penuh" gagal.)

// cleanup
await db.delete(usageCounters).where(like(usageCounters.subject, `rl-%-${stamp}`));
console.log("\n(data test dibersihkan)");
console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
