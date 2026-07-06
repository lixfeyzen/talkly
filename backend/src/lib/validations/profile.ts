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

// Kedua field opsional TAPI minimal satu harus ada -- endpoint yang sama
// dipakai onboarding (bahasa / bahasa+nama) dan settings (salah satu saja).
// Nama: teks bebas 1-60 char setelah trim (dipakai untuk sapaan di UI).
export const updateProfileSchema = z
  .object({
    nativeLanguage: z.enum(NATIVE_LANGUAGES).optional(),
    name: z.string().trim().min(1).max(60).optional(),
  })
  .refine((d) => d.nativeLanguage !== undefined || d.name !== undefined, {
    message: "at_least_one_field",
  });
