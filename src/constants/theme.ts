/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Talkly brand (2026-07-03, arahan user dari referensi "Lumina" -- AI
// assistant gelap elegan): latar hampir-hitam keunguan, kartu gelap
// membulat, teks putih, aksen UNGU. Senada dgn layar auth (dark hero) →
// seluruh app satu kepribadian gelap. Tema light DISENGAJA disamakan dgn
// dark (brand dark-first; lihat userInterfaceStyle di app.json).
export const AccentColor = '#6C5CE7';
export const AccentColorOn = '#ffffff';

// Gradient latar: ungu-gelap pekat -> hampir hitam (nuansa layar Lumina).
export const BrandGradient = ['#191627', '#121019', '#0C0B10'] as const;

// Di latar gelap, "bayangan" kartu = kedalaman halus (shadow hitam tipis);
// pemisah utama antar-permukaan adalah beda tone bg kartu vs latar.
export const CardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

const brandPalette = {
  text: '#F4F2FA',
  background: '#0F0E15',
  backgroundElement: '#1C1A26',
  backgroundSelected: '#2B2839',
  textSecondary: '#9B97B0',
};

export const Colors = {
  light: brandPalette,
  dark: brandPalette,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
