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

// Aksi = HITAM (satu CTA per layar). Tak ada lagi aksen ungu. AccentColor
// dipetakan ke tinta hitam supaya tombol/highlight lama otomatis jadi hitam.
export const AccentColor = '#111114';
export const AccentColorOn = '#FFFFFF';
export const Ink = '#111114';

// Hero band near-black (dipakai di momen kunci: header tebal / skor readiness),
// senada heroBg auth.
export const HeroBg = '#101014';
export const HeroText = '#FFFFFF';

// Placeholder input (samakan dengan AuthPalette.placeholder).
export const Placeholder = '#8B8F98';

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

// Kanvas terang: linear halus near-putih (pengganti radial mockup; RN linear
// tak radial). Kartu putih di atasnya menonjol lewat hairline + shadow lembut.
export const BrandGradient = ['#FBFBFC', '#F4F5F7'] as const;

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

// Palet tema (terang). Kunci dipertahankan; nilai dibalik ke terang.
const brandPalette = {
  text: '#111114', // teks utama near-black
  background: '#F6F7F9', // kanvas app abu sangat terang
  backgroundElement: '#FFFFFF', // permukaan kartu putih
  backgroundSelected: '#F2F3F5', // input / muted / chip terpilih
  textSecondary: '#60646C', // teks sekunder
};

export const Colors = {
  light: brandPalette,
  dark: brandPalette,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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
