import { pgTable, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Ringkasan agregat per-user per-kategori kesalahan -- dihitung ulang tiap
// sesi selesai, dibaca cepat buat dashboard & pemilihan skenario adaptif
// (hindari agregasi mahal dari mistake_patterns tiap kali dibutuhkan).
export const userMistakeStats = pgTable("user_mistake_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  occurrenceCount: integer("occurrence_count").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});
