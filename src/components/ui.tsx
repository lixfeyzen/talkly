/**
 * Talkly UI kit — primitif bersama untuk SEMUA layar after-login (redesign
 * 2026-07-04). Nilai (radius/padding/font/warna/shadow) DISALIN PERSIS dari
 * component sheet Claude Design "Talkly After-Login.dc.html" supaya app 1:1
 * dengan mockup. Pakai komponen ini; jangan bikin varian sendiri per layar.
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

import { Ink, Placeholder, HairlineBorder, Pastel, Spacing } from '@/constants/theme';

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
// Label sekunder di stat tile (tone lebih redup dari inti) — dari mockup.
const PASTEL_LABEL: Record<PastelName, string> = {
  ice: '#3E6570',
  lilac: '#6E5C93',
  cream: '#7A6B3A',
  pink: '#7A5560',
  mint: '#3B6152',
};

// ---- Card: permukaan putih + garis rambut + bayangan lembut (r20) ----
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---- Kartu HERO pastel + glow (countdown / momen kunci) ----
// bg pastel, shadow warna, sorot radial putih di pojok kanan-atas.
export function HeroCard({
  children,
  pastel = 'lilac',
  style,
}: {
  children: ReactNode;
  pastel?: PastelName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.heroCard, { backgroundColor: PASTEL_BG[pastel] }, style]}>
      <View style={styles.heroGlow} />
      <View style={styles.heroInner}>{children}</View>
    </View>
  );
}

// ---- Tombol primer: pill HITAM h50, satu per layar (opsi ikon trailing) ----
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: FeatherName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryBtn,
        { opacity: disabled ? 0.4 : loading ? 0.7 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text style={styles.primaryBtnText}>{label}</Text>
          {icon && <Feather name={icon} size={17} color="#FFFFFF" />}
        </>
      )}
    </Pressable>
  );
}

// ---- Tombol sekunder / ghost: pill PUTIH ber-border h50 ----
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
      style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }, style]}>
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

// ---- Tile pastel berisi ikon (identitas fitur), r14 ----
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
      style={[styles.pastelTile, { width: size, height: size, backgroundColor: PASTEL_BG[pastel] }]}>
      <Feather name={icon} size={Math.round(size * 0.45)} color={PASTEL_INK[pastel]} />
    </View>
  );
}

// ---- Chip: selected(hitam) / default(abu F2F3F5, no border) / pastel role ----
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
  pastel?: PastelName;
}) {
  let bg: string;
  let fg: string;
  let border = 'transparent';
  let weight: TextStyle['fontWeight'] = '600';
  if (selected) {
    bg = pastel ? PASTEL_BG[pastel] : Ink;
    fg = pastel ? PASTEL_INK[pastel] : '#FFFFFF';
    if (pastel) weight = '700';
  } else if (pastel) {
    bg = '#FFFFFF';
    fg = '#60646C';
    border = HairlineBorder;
  } else {
    bg = '#F2F3F5';
    fg = '#60646C';
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
      ]}>
      {icon && <Feather name={icon} size={14} color={fg} />}
      <Text style={[styles.chipText, { color: fg, fontWeight: weight }]}>{label}</Text>
    </Pressable>
  );
}

// ---- Baris daftar: tile pastel(44) + judul + nilai + chevron, r20 ----
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
      <PastelTile pastel={pastel} icon={icon} size={44} />
      <Text style={styles.listRowTitle} numberOfLines={1}>
        {title}
      </Text>
      {value ? <Text style={styles.listRowValue}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color="#8B8F98" />
    </Pressable>
  );
}

// ---- Stat tile: ikon + angka besar tabular + label, di atas pastel ----
export function StatTile({
  pastel,
  icon,
  value,
  label,
  style,
}: {
  pastel: PastelName;
  icon?: FeatherName;
  value: string | number;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: PASTEL_BG[pastel] }, style]}>
      {icon && <Feather name={icon} size={17} color={PASTEL_INK[pastel]} />}
      <Text style={[styles.statNumber, { color: PASTEL_INK[pastel] }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: PASTEL_LABEL[pastel] }]}>{label}</Text>
    </View>
  );
}

// ---- Mini bar (dimensi readiness): label + skor + track r999 ----
export function MiniBar({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <View style={styles.miniBar}>
      <View style={styles.miniBarHead}>
        <Text style={styles.miniBarLabel}>{label}</Text>
        <Text style={styles.miniBarScore}>{score}</Text>
      </View>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

// ---- Toggle (settings): pill 46x28 ----
export function Toggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={[styles.toggle, { backgroundColor: on ? Ink : '#E4E5E8' }]}>
      <View style={[styles.toggleKnob, on ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </Pressable>
  );
}

// ---- Label seksi (12/700/uppercase/+0.5/#8B8F98) ----
export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

// ---- Gelembung chat: user(hitam) / assistant(abu), radius asimetris r18 ----
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
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant, style]}>
      {children}
    </View>
  );
}
export const BubbleTextColor = { user: '#FFFFFF', assistant: Ink } as const;

// ---- Pill "Listen" di bawah bubble AI ----
export function ListenPill({
  playing,
  onPress,
  disabled,
}: {
  playing: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={styles.listenPill}>
      <Feather name="volume-2" size={13} color={Ink} />
      <Text style={styles.listenText}>{playing ? 'Playing' : 'Listen'}</Text>
    </Pressable>
  );
}

// ---- Tiga titik "sedang mengetik" ----
export function TypingDots() {
  return (
    <View style={styles.typing}>
      <View style={styles.typingDot} />
      <View style={styles.typingDot} />
      <View style={styles.typingDot} />
    </View>
  );
}

// ---- Empty state (motif bubble pastel — tanda tangan brand) ----
export function EmptyState({
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <View style={[styles.stateDot, { top: 16, left: 22, backgroundColor: Pastel.pink }]} />
      <View style={[styles.stateDot, { top: 40, right: 26, backgroundColor: Pastel.mint }]} />
      <View style={[styles.stateDot, { bottom: 20, left: 34, backgroundColor: Pastel.cream }]} />
      <View style={styles.stateBubble}>
        <Text style={styles.stateBubbleText}>Let&apos;s talk</Text>
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateSub}>{subtitle}</Text>
      {ctaLabel && onCta && (
        <Pressable onPress={onCta} style={styles.statePill}>
          <Text style={styles.statePillText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---- Error state ----
export function ErrorState({
  title,
  subtitle,
  onRetry,
}: {
  title: string;
  subtitle: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      <View style={styles.errorTile}>
        <Feather name="alert-triangle" size={22} color="#D92D20" />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateSub}>{subtitle}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.statePill}>
          <Feather name="rotate-ccw" size={15} color="#FFFFFF" />
          <Text style={styles.statePillText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---- Bottom navigation: KARTU membulat mengambang (r16, ber-border) ----
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
        <Feather name={icon} size={23} color={on ? Ink : '#8B8F98'} />
        <Text style={[styles.tabLabel, { color: on ? Ink : '#8B8F98', fontWeight: on ? '700' : '500' }]}>
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.bottomBar}>
      {tab('home', 'home', 'Home', onHome)}
      {tab('progress', 'bar-chart-2', 'Progress', onProgress)}
      {tab('settings', 'sliders', 'Settings', onSettings)}
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: 'rgba(17,17,20,1)',
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  card: {
    ...CARD_SHADOW,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HairlineBorder,
    padding: 20,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(124,90,200,1)',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  heroGlow: {
    position: 'absolute',
    top: -28,
    right: -22,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  heroInner: { position: 'relative' },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: Ink,
    borderRadius: 999,
    height: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  ghostBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { color: Ink, fontSize: 15, fontWeight: '700' },
  pastelTile: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 40,
  },
  chipText: { fontSize: 13 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 62,
    shadowColor: 'rgba(17,17,20,1)',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  listRowTitle: { flex: 1, color: Ink, fontSize: 15, fontWeight: '600' },
  listRowValue: { color: '#60646C', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  statTile: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    gap: 7,
  },
  statNumber: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 12, fontWeight: '600' },
  miniBar: { gap: 8 },
  miniBarHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  miniBarLabel: { fontSize: 14, fontWeight: '700', color: Ink },
  miniBarScore: { fontSize: 14, fontWeight: '700', color: Ink, fontVariant: ['tabular-nums'] },
  miniBarTrack: { height: 6, borderRadius: 999, backgroundColor: '#F2F3F5', overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 999, backgroundColor: Ink },
  toggle: { width: 46, height: 28, borderRadius: 999, justifyContent: 'center' },
  toggleKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(17,17,20,1)',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleKnobOn: { right: 3 },
  toggleKnobOff: { left: 3 },
  sectionLabel: {
    color: '#8B8F98',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 11 },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Ink,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F3F5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 18,
  },
  listenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: HairlineBorder,
    backgroundColor: '#FFFFFF',
  },
  listenText: { fontSize: 12, fontWeight: '600', color: Ink },
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: '#F2F3F5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  typingDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#B4B7BE' },
  stateBox: {
    borderRadius: 16,
    backgroundColor: '#F7F8F9',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 9,
    overflow: 'hidden',
  },
  stateDot: { position: 'absolute', width: 9, height: 9, borderRadius: 999 },
  stateBubble: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Pastel.lilac,
    transform: [{ rotate: '-4deg' }],
    marginBottom: 2,
  },
  stateBubbleText: { fontSize: 13, fontWeight: '700', color: Pastel.lilacInk },
  stateTitle: { fontSize: 15, fontWeight: '700', color: Ink, textAlign: 'center' },
  stateSub: { fontSize: 13, lineHeight: 19, color: '#60646C', textAlign: 'center' },
  errorTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FBE3E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: Ink,
  },
  statePillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: HairlineBorder,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: Spacing.two,
    paddingHorizontal: 34,
  },
  tabItem: { alignItems: 'center', gap: 5, width: 60 },
  tabLabel: { fontSize: 11 },
});

export { Placeholder };
