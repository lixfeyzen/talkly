import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandGradient } from '@/constants/theme';

// Latar gradient lavender khas brand (referensi UI kit Coursely) -- dipakai
// sbg pengganti ThemedView container di layar-layar utama.
export function GradientBackground({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient colors={[...BrandGradient]} style={[styles.fill, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
