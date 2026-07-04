/**
 * Talkly UI kit — primitif bersama untuk SEMUA layar after-login (redesign
 * 2026-07-04). Satu sumver kebenaran supaya 8 layar konsisten: kartu putih
 * ber-hairline, tombol hitam (satu CTA/layar), tile pastel meng-color-code
 * fitur, angka besar tabular. Turunan langsung dari mockup Claude Design +
 * palet auth. Pakai komponen ini; jangan bikin varian sendiri per layar.
 */
import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  type ViewStyle,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  Ink,
  Placeholder,
  HairlineBorder,
  Pastel,
  Radius,
  Spacing,
  CardShadow,
} from '@/constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
export type PastelName = 'ice' | 'lilac' | 'cream' | 'pink' | 'mint';

const PASTEL_BG: Record<PastelName, string> = {
  ice: Pastel.ice,
  lilac: Pastel.lilac,
  cream: Pastel.cream,
  pink: Pastel.pink,
  mint: Pastel.mint,
};
const PASTEL_INK: Record<PastelName, string> = {
  ice: Pastel.iceInk,
  lilac: Pastel.lilacInk,
  cream: Pastel.creamInk,
  pink: Pastel.pinkInk,
  mint: Pastel.mintInk,
};

// ---- Card: permukaan putih + garis rambut + bayangan lembut ----
export function Card({
  children,
  style,
  glow,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean; // kartu "hero" (mis. countdown) — bayangan sedikit lebih dalam
}) {
  return <View style={[styles.card, glow && styles.cardGlow, style]}>{children}</View>;
}

// ---- Tombol primer: pill HITAM, satu per layar ----
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryBtn,
        { opacity: disabled ? 0.4 : loading ? 0.7 : pressed ? 0.88 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

// ---- Tombol sekunder / ghost ----
export function GhostButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.6 : 1 }, style]}>
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

// ---- Tile pastel berisi ikon (identitas fitur) ----
export function PastelTile({
  pastel,
  icon,
  size = 44,
}: {
  pastel: PastelName;
  icon: FeatherName;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.pastelTile,
        { width: size, height: size, backgroundColor: PASTEL_BG[pastel] },
      ]}>
      <Feather name={icon} size={Math.round(size * 0.42)} color={PASTEL_INK[pastel]} />
    </View>
  );
}

// ---- Chip: pill terpilih (hitam) / default (putih ber-hairline) ----
export function Chip({
  label,
  selected,
  onPress,
  icon,
  pastel,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: FeatherName;
  pastel?: PastelName; // chip role berwarna pastel (opsional)
}) {
  const bg = selected ? Ink : pastel ? PASTEL_BG[pastel] : '#FFFFFF';
  const fg = selected ? '#FFFFFF' : pastel ? PASTEL_INK[pastel] : Ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: selected || pastel ? 'transparent' : HairlineBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {icon && <Feather name={icon} size={14} color={fg} />}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---- Baris daftar: tile pastel + judul + nilai + chevron ----
export function ListRow({
  pastel,
  icon,
  title,
  value,
  onPress,
}: {
  pastel: PastelName;
  icon: FeatherName;
  title: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.listRow, { opacity: pressed ? 0.7 : 1 }]}>
      <PastelTile pastel={pastel} icon={icon} size={40} />
      <Text style={styles.listRowTitle} numberOfLines={1}>
        {title}
      </Text>
      {value ? <Text style={styles.listRowValue}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color="#C2C5CC" />
    </Pressable>
  );
}

// ---- Stat tile: angka besar tabular di atas pastel ----
export function StatTile({
  pastel,
  value,
  label,
  style,
}: {
  pastel: PastelName;
  value: string | number;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: PASTEL_BG[pastel] }, style]}>
      <Text style={[styles.statNumber, { color: PASTEL_INK[pastel] }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: PASTEL_INK[pastel] }]}>{label}</Text>
    </View>
  );
}

// ---- Label seksi (kecil, huruf kapital ber-jarak) ----
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

// ---- Gelembung chat: user (hitam) / assistant (abu) ----
export function MessageBubble({
  role,
  children,
  style,
}: {
  role: 'user' | 'assistant';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const isUser = role === 'user';
  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
        style,
      ]}>
      {children}
    </View>
  );
}

// Warna teks bubble (dipakai layar conversation utk teks di dalam bubble).
export const BubbleTextColor = { user: '#FFFFFF', assistant: Ink } as const;

// ---- Bottom navigation (3 tab) ----
export function BottomNav({
  active,
  onHome,
  onProgress,
  onSettings,
}: {
  active: 'home' | 'progress' | 'settings';
  onHome?: () => void;
  onProgress?: () => void;
  onSettings?: () => void;
}) {
  const tab = (
    key: 'home' | 'progress' | 'settings',
    icon: FeatherName,
    label: string,
    onPress?: () => void,
  ) => {
    const on = active === key;
    return (
      <Pressable
        onPress={onPress}
        disabled={on}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={styles.tabItem}>
        <Feather name={icon} size={20} color={on ? Ink : '#A9ADB4'} />
        <Text style={[styles.tabLabel, { color: on ? Ink : '#A9ADB4' }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.bottomBar}>
      {tab('home', 'home', 'Home', onHome)}
      {tab('progress', 'bar-chart-2', 'Progress', onProgress)}
      {tab('settings', 'settings', 'Settings', onSettings)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CardShadow,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: HairlineBorder,
    padding: Spacing.four,
  },
  cardGlow: { shadowOpacity: 0.1, shadowRadius: 22 },
  primaryBtn: {
    backgroundColor: Ink,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  ghostBtn: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  ghostBtnText: { color: Ink, fontSize: 15, fontWeight: '600' },
  pastelTile: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    minHeight: 44,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    minHeight: 64,
  },
  listRowTitle: { flex: 1, color: Ink, fontSize: 15, fontWeight: '600' },
  listRowValue: { color: '#60646C', fontSize: 14, fontWeight: '500' },
  statTile: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 12, fontWeight: '600', opacity: 0.85 },
  sectionLabel: {
    color: '#8B8F98',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Ink, borderBottomRightRadius: 6 },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F3F5',
    borderBottomLeftRadius: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: HairlineBorder,
    backgroundColor: '#FFFFFF',
  },
  tabItem: { alignItems: 'center', gap: 3, padding: Spacing.two, minWidth: 64 },
  tabLabel: { fontSize: 12, fontWeight: '600' },
});

// Re-export supaya layar bisa akses placeholder color tanpa import theme ganda.
export { Placeholder };
