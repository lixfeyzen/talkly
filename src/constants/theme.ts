/**
 * Talkly design tokens — LIGHT system (redesign 2026-07-04, dari Claude Design
 * "Talkly After-Login").
 *
 * Bahasa visual diturunkan dari layar auth (login/register): hero near-black +
 * SHEET PUTIH + aksen PASTEL + tombol HITAM. Setelah login harus terasa satu
 * app dengan auth, jadi seluruh layar = kanvas terang, kartu putih ber-hairline,
 * angka besar tabular, satu CTA hitam per layar, pastel meng-color-code fitur.
 *
 * Nama token lama (text/background/backgroundElement/backgroundSelected/
 * textSecondary + AccentColor/AccentColorOn/BrandGradient/CardShadow) SENGAJA
 * dipertahankan supaya ThemedText/ThemedView existing ikut terbalik ke terang
 * tanpa menyentuh tiap pemanggil.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Aksi = UNGU merek (desain final 2026-10-18; sebelumnya hitam). AccentColor
// dipakai komponen lama, jadi ikut berubah tanpa menyentuh tiap pemanggil.
export const AccentColor = '#5B3FD9';
export const AccentColorOn = '#FFFFFF';
export const Ink = '#111114';

// Hero band (momen kunci: header tebal / skor readiness).
// Desain final ungu (2026-10-18): band hero = ungu tua merek, bukan hitam.
// Teks putih di atasnya ~7,9:1.
export const HeroBg = '#4C2BC4';
export const HeroText = '#FFFFFF';

// Placeholder input (samakan dengan AuthPalette.placeholder). #686770 di atas
// #F4F4F5 = 5,1:1 (lolos WCAG AA); nilai lama #8B8F98 cuma 2,9:1.
export const Placeholder = '#686770';

// Identitas merek (desain final ungu, 2026-10-18, docs/sistem-desain-talkly-2026-10-18.md).
// Ungu dipakai untuk logo, tombol utama layar awal, pilihan aktif, dan stabilo
// kata yang sudah dikoreksi. Teks putih di atas violet = 6,65:1.
export const Brand = {
  violet: '#5B3FD9',
  violetLight: '#8B5CF6',
  violetDeep: '#4C2BC4',
  // Stabilo kata yang benar (teks tinta di atasnya ~12:1).
  highlight: '#E4D7FB',
  // Cahaya lembut di atas layar awal.
  glow: '#EFE8FF',
  // Kanvas kertas hangat layar awal.
  paper: '#FBFAF8',
  // Kata yang salah dicoret abu, bukan merah (5,7:1 di atas putih).
  strike: '#666571',
  selectedBg: '#F3EDFF',
} as const;

// Plus Jakarta Sans dimuat di _layout.tsx. Font kustom di Android mengabaikan
// fontWeight, jadi tiap ketebalan memakai nama keluarganya sendiri.
export const Font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

// Garis rambut pemisah kartu di atas putih (sinyal premium utama).
export const HairlineBorder = '#ECEDEF';

// Warna semantik (samakan dengan auth).
export const Danger = '#D92D20';
export const Success = '#067647';

// Sistem PASTEL: tiap fitur satu warna + warna teks gelap yang terbaca di atasnya.
// Peta: ice=Conversations, lilac=Interview/readiness, cream=Trajectory/progress,
// pink=Streak, mint=success/"strongest".
export const Pastel = {
  ice: '#D8EFF6',
  iceInk: '#23404B',
  lilac: '#E6DCF8',
  lilacInk: '#3E2C63',
  cream: '#F7EDC9',
  creamInk: '#4E4318',
  pink: '#F9D9E0',
  pinkInk: '#3D2A31',
  mint: '#CDEEDB',
  mintInk: '#1F4433',
} as const;

// Kanvas terang kertas hangat dengan sedikit rona ungu (desain final). Kartu
// putih di atasnya menonjol lewat hairline + shadow lembut.
export const BrandGradient = ['#FBFAF8', '#F5F3F8'] as const;

// Skala radius konsisten (dari mockup: 32 / 20 / 16 / 999).
export const Radius = { sm: 12, md: 16, lg: 20, xl: 24, sheet: 32, pill: 999 } as const;

// Bayangan lembut di atas putih (bukan gelap-di-gelap lagi).
export const CardShadow = {
  shadowColor: 'rgba(17,17,20,1)',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
