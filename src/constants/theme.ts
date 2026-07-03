/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Talkly brand (2026-07-03, arahan user dari referensi UI kit "Coursely"):
// terang, lavender lembut, kartu putih membulat, aksen UNGU. Satu bahasa
// desain utk seluruh app -- tema dark DISENGAJA disamakan dgn light (brand
// light-first; lihat juga userInterfaceStyle di app.json).
export const AccentColor = '#6C5CE7';
export const AccentColorOn = '#ffffff';

// Gradient latar khas kit: lavender -> hampir putih. Dipakai via komponen
// GradientBackground (expo-linear-gradient).
export const BrandGradient = ['#E4DDFF', '#F2ECFB', '#FAF8FF'] as const;

// Bayangan kartu lembut (senada aksen) -- dipakai kartu putih di atas gradient.
export const CardShadow = {
  shadowColor: '#6C5CE7',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

const brandPalette = {
  text: '#1B1740',
  background: '#F5F2FE',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#E7E1FB',
  textSecondary: '#6B678D',
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
