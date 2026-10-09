import { date, pgTable, text, timestamp, uuid, integer, jsonb, unique, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  authVersion: integer("auth_version").notNull().default(0),
  // Nama panggilan untuk sapaan ("Hi Mateo") -- opsional, diisi saat
  // onboarding/settings. NULL = app fallback ke potongan email.
  name: text("name"),
  // Bahasa sehari-hari user (bukan negara -- lebih fungsional & ramah
  // privasi). NULL = belum memilih -> app menampilkan onboarding sekali.
  // Dipakai AI: penjelasan koreksi ditulis dalam bahasa ini.
  nativeLanguage: text("native_language"),
  // Interview-Day Countdown: tanggal interview NYATA user + role yang dilamar.
  // NULL = belum di-set -> dashboard menampilkan ajakan set tanggal.
  // date (bukan timestamp): yang penting HARI-nya, bebas jebakan timezone.
  interviewDate: date("interview_date"),
  interviewPlanRole: text("interview_plan_role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Kode reset password (forgot password). Kode 6 digit dikirim ke email user;
// yang disimpan HANYA hash-nya (sha256) -- bocornya isi tabel ini tidak
// membocorkan kode yang masih hidup. Single-use + kedaluwarsa 15 menit +
// batas percobaan (anti brute-force 6 digit).
export const passwordResetCodes = pgTable("password_reset_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Satu sesi = satu percakapan roleplay (mis. "pesan kopi", "interview kerja").
export const conversationSessions = pgTable("conversation_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scenario: text("scenario").notNull(),
  targetLanguage: text("target_language").notNull(),
  // Riwayat pesan (role: user/assistant + isi) disimpan sebagai JSON, bukan
  // tabel terpisah per-pesan -- percakapan roleplay pendek (~10-20 giliran),
  // nggak butuh query per-pesan individual di MVP ini.
  transcript: jsonb("transcript").notNull().default([]),
  // Kategori kelemahan yang jadi fokus sesi ini (fitur #3 skenario adaptif).
  // Disimpan di sesi (bukan dikirim ulang tiap giliran) supaya seluruh
  // percakapan konsisten menargetkan pola yang sama.
  focusCategories: jsonb("focus_categories").notNull().default([]),
  // Fitur #6 (Interview Readiness): 'free' = latihan biasa,
  // 'mock_interview' = wawancara terstruktur 5 pertanyaan + rapor.
  mode: text("mode").notNull().default("free"),
  // Role yang diwawancarai (hanya terisi utk mock_interview).
  interviewRole: text("interview_role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // FK userId tak auto-index di Postgres. Query panas: riwayat/dashboard
  // "WHERE user_id=? ORDER BY created_at DESC" -> index komposit = ambil
  // baris milik user tanpa full scan (skala ke jutaan baris).
  index("conversation_sessions_user_created_idx").on(table.userId, table.createdAt.desc()),
]);

// Rapor kesiapan interview (fitur #6) -- satu rapor per sesi mock interview.
export const interviewReports = pgTable("interview_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .unique() // satu sesi = satu rapor; generate ulang tak bikin duplikat
    .references(() => conversationSessions.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  // Isi rapor terstruktur (dimensi, jawaban terkuat/terlemah, fixes,
  // answer upgrades) -- bentuknya dijaga oleh zod saat generate.
  report: jsonb("report").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // getLatestReport/getPreviousScore/trajectory: "WHERE user_id=? ORDER BY
  // created_at DESC". (sessionId sudah ter-index via unique().)
  index("interview_reports_user_created_idx").on(table.userId, table.createdAt.desc()),
]);

// Satu baris = satu jenis kesalahan yang terdeteksi di sesi tertentu.
// INI fondasi fitur pembeda utama: pelacakan pola kesalahan lintas sesi.
export const mistakePatterns = pgTable("mistake_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => conversationSessions.id, { onDelete: "cascade" }),
  // Kategori kesalahan terstruktur, mis. "verb_conjugation_past_tense",
  // "gender_agreement", "preposition_usage" -- dipakai buat agregasi &
  // memilih skenario adaptif berikutnya.
  category: text("category").notNull(),
  // Kutipan kalimat asli + koreksinya, buat ditampilkan di dashboard progres.
  originalText: text("original_text").notNull(),
  correctedText: text("corrected_text").notNull(),
  note: text("note"), // Native-language explanation; old corrections stay nullable.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // dashboard "recent corrections" + trajectory: "WHERE user_id=? ORDER BY
  // created_at DESC". Tabel ini tumbuh PALING cepat (tiap koreksi = 1 baris).
  index("mistake_patterns_user_created_idx").on(table.userId, table.createdAt.desc()),
  // FK cascade delete by session + query per-sesi.
  index("mistake_patterns_session_idx").on(table.sessionId),
]);

// Ringkasan agregat per-user per-kategori kesalahan -- dihitung ulang tiap
// sesi selesai, dibaca cepat buat dashboard & pemilihan skenario adaptif
// (hindari agregasi mahal dari mistake_patterns tiap kali dibutuhkan).
// Streak latihan harian per-user (fitur #4). Satu baris per user (userId
// unique). Tanggal pakai kolom `date` (bukan timestamp) karena streak dihitung
// per-hari kalender, bukan per-24-jam. Batasan MVP yang disengaja: hari
// dihitung dalam UTC (timezone per-user = kerumitan V2).
export const userStreaks = pgTable("user_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastPracticeDate: date("last_practice_date").notNull(),
});

export const userMistakeStats = pgTable(
  "user_mistake_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    occurrenceCount: integer("occurrence_count").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Wajib ada -- recordMistakes() di lib/data/conversations.ts pakai
    // onConflictDoUpdate([userId, category]), butuh unique constraint asli
    // di DB (bukan cuma dijamin di level kode) supaya UPSERT-nya valid.
    unique().on(table.userId, table.category),
  ],
);

// Weekly challenges (stretch #7: skenario tantangan mingguan, unlock tiap minggu).
// Status flow: locked → available → completed.
// Unlock rule: minggu N+1 available kalau minggu N completed.
// Scenario ditentukan dari kategori kelemahan terbesar user (dari userMistakeStats).
export const weeklyChallenges = pgTable(
  "weekly_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    // locked | available | completed
    status: text("status").notNull().default("locked"),
    // Skenario challenge (mis. "Job interview", "Tell me about yourself")
    scenario: text("scenario").notNull(),
    // Kategori focus challenge (dari kelemahan user) — nullable karena
    // challenge minggu 1 belum ada data kelemahan.
    focusCategory: text("focus_category"),
    // Skor 0-100 (isi setelah selesai).
    score: integer("score"),
    // Kapan challenge selesai.
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.weekNumber),
    index("weekly_challenges_user_status_idx").on(table.userId, table.status),
  ],
);

// Rate limiting fixed-window, DIHITUNG DI DB (tahan restart & serverless --
// pola yang sama dengan brute-force lock reset password). subject = userId
// atau "ip:<alamat>"; bucket = "<aksi>:<m|d>:<jendela ISO>". Baris lama
// dibersihkan oleh cleanup-usage-counters (kecil: 1 baris/menit-aktif/user).
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: text("subject").notNull(),
    bucket: text("bucket").notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Wajib -- consumeQuota() pakai onConflictDoUpdate([subject, bucket]).
    unique().on(table.subject, table.bucket),
  ],
);

// One logical send, including its recoverable AI result and committed response.
export const conversationTurnRequests = pgTable("conversation_turn_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  sessionId: uuid("session_id").references(() => conversationSessions.id, { onDelete: "cascade" }),
  leaseToken: uuid("lease_token").notNull(),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }).notNull(),
  result: jsonb("result"),
  response: jsonb("response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.userId, table.requestId),
  index("conversation_turn_requests_user_created_idx").on(table.userId, table.createdAt),
]);
