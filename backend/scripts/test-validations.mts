// Test murni buat skema validasi input -- TIDAK butuh database atau API key,
// bisa dijalankan & dibuktikan kapan pun (beda dari test-auth.mts yang butuh
// DATABASE_URL hidup).
import { registerSchema, loginSchema } from "../src/lib/validations/auth";
import { sendMessageSchema } from "../src/lib/validations/conversation";
import { updateProfileSchema } from "../src/lib/validations/profile";

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

// --- registerSchema ---
check(
  "register: email+password valid diterima",
  registerSchema.safeParse({ email: "a@b.com", password: "password123" }).success,
);
check(
  "register: email tanpa @ ditolak",
  !registerSchema.safeParse({ email: "bukan-email", password: "password123" }).success,
);
check(
  "register: password < 8 karakter ditolak",
  !registerSchema.safeParse({ email: "a@b.com", password: "short" }).success,
);
check(
  "register: email di-lowercase & trim otomatis",
  registerSchema.safeParse({ email: "  A@B.COM  ", password: "password123" }).data?.email ===
    "a@b.com",
);

// --- loginSchema ---
check(
  "login: password kosong ditolak",
  !loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
);
check(
  "login: email invalid ditolak",
  !loginSchema.safeParse({ email: "bukan-email", password: "apapun" }).success,
);

// --- sendMessageSchema ---
check(
  "conversation: pesan valid diterima (sesi baru)",
  sendMessageSchema.safeParse({
    scenario: "pesan kopi",
    targetLanguage: "Spanish",
    message: "Hola, quiero un café",
  }).success,
);
check(
  "conversation: pesan kosong ditolak",
  !sendMessageSchema.safeParse({ message: "" }).success,
);
check(
  "conversation: pesan lebih dari 2000 karakter ditolak",
  !sendMessageSchema.safeParse({ message: "a".repeat(2001) }).success,
);
check(
  "conversation: sessionId harus UUID valid kalau diisi",
  !sendMessageSchema.safeParse({ sessionId: "bukan-uuid", message: "halo" }).success,
);
check(
  "conversation: lanjut sesi (sessionId valid, tanpa scenario) diterima",
  sendMessageSchema.safeParse({
    sessionId: "00000000-0000-0000-0000-000000000000",
    message: "lanjut ngobrol",
  }).success,
);

// --- updateProfileSchema (bahasa native) ---
check(
  "profile: bahasa dari allowlist diterima",
  updateProfileSchema.safeParse({ nativeLanguage: "Indonesian" }).success,
);
check(
  "profile: bahasa di luar allowlist ditolak (bukan teks bebas)",
  !updateProfileSchema.safeParse({ nativeLanguage: "Klingon" }).success,
);
check(
  "profile: body kosong ditolak (minimal satu field)",
  !updateProfileSchema.safeParse({}).success,
);
check(
  "profile: name saja diterima (dipangkas spasinya)",
  updateProfileSchema.safeParse({ name: "  Mateo " }).success,
);
check(
  "profile: name kosong-setelah-trim ditolak",
  !updateProfileSchema.safeParse({ name: "   " }).success,
);
check(
  "profile: name >60 char ditolak",
  !updateProfileSchema.safeParse({ name: "x".repeat(61) }).success,
);

console.log(`\nRINGKASAN: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
