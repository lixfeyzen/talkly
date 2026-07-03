import { z } from "zod";

// Bahasa native yang didukung -- allowlist (bukan teks bebas) supaya nilai
// yang masuk prompt AI selalu terkontrol. Nilai kanonik pakai nama Inggris,
// konsisten dengan targetLanguage yang sudah dipakai ('Spanish', dst).
export const NATIVE_LANGUAGES = [
  "Indonesian",
  "English",
  "Spanish",
  "French",
  "Japanese",
  "Mandarin",
  "Korean",
  "Arabic",
  "Portuguese",
  "German",
] as const;

export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number];

export const updateProfileSchema = z.object({
  nativeLanguage: z.enum(NATIVE_LANGUAGES),
});
