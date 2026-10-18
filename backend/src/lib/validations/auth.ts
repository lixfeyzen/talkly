import { z } from "zod";

// .trim() TIDAK dipakai di password (beda dari email) -- spasi di awal/akhir
// adalah karakter sah dalam password. Tapi password yang isinya HANYA
// whitespace (lolos .min(8) kalau cuma dihitung panjang) ditolak eksplisit,
// supaya tidak ada akun dengan password yang tidak bisa diketik ulang.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .refine((v) => /\S/.test(v), "Password tidak boleh hanya spasi"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password wajib diisi"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().regex(/^\d{6}$/, "Kode harus 6 digit"),
  newPassword: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .refine((v) => /\S/.test(v), "Password tidak boleh hanya spasi"),
});
