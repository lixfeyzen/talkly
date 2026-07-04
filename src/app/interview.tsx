import { useState, type ComponentProps } from 'react';
import { StyleSheet, Pressable, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { PrimaryButton, SectionLabel } from '@/components/ui';
import { Ink, Pastel, HairlineBorder, HeroBg, MaxContentWidth } from '@/constants/theme';
import { INTERVIEW_ROLES } from '@/lib/interviews/api';

type FeatherName = ComponentProps<typeof Feather>['name'];

// Tone lilac-dalam untuk teks role terpilih (dari mockup, lebih pekat dari
// Pastel.lilacInk supaya label 700 kontras di atas lilac).
const ROLE_SELECTED_TEXT = '#2A1D45';
const MUTED_ICON = '#60646C';

// Cara kerja mock (3 baris di sheet putih). Tile ABU (#F2F3F5) + ikon gelap,
// PERSIS mockup (bukan tile pastel).
const HOW_IT_WORKS: { icon: FeatherName; text: string }[] = [
  { icon: 'message-square', text: 'Five questions, like a real interview' },
  { icon: 'pause', text: 'No corrections until the very end' },
  { icon: 'file-text', text: 'A readiness report when you finish' },
];

// Ikon per role — dipetakan dari SVG di mockup ke padanan Feather.
const ROLE_ICON: Record<(typeof INTERVIEW_ROLES)[number], FeatherName> = {
  'Software Engineer': 'code',
  Marketing: 'send',
  Sales: 'trending-up',
  Finance: 'pie-chart',
  Designer: 'pen-tool',
  General: 'globe',
};

// Mulai mock interview (fitur #6): pilih role -> 5 pertanyaan -> rapor.
export default function InterviewStartScreen() {
  const [role, setRole] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HERO band gelap */}
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.dot} />
            <View style={styles.breathe}>
              <Text style={styles.breatheText}>Breathe</Text>
            </View>

            <View style={styles.backRow}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
                <Feather name="chevron-left" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.heroText}>
              <Text style={styles.title}>A calm practice run.</Text>
              <Text style={styles.subtitle}>
                Five questions, like the real thing. I hold every correction until the end.
              </Text>
            </View>
          </View>

          {/* WHITE sheet */}
          <View style={styles.sheet}>
            {/* How it works */}
            <View style={styles.howBlock}>
              <SectionLabel style={styles.blockLabel}>How it works</SectionLabel>
              {HOW_IT_WORKS.map((row) => (
                <View key={row.text} style={styles.howRow}>
                  <View style={styles.howTile}>
                    <Feather name={row.icon} size={18} color={Ink} />
                  </View>
                  <Text style={styles.howText}>{row.text}</Text>
                </View>
              ))}
            </View>

            {/* Choose a role */}
            <View style={styles.roleBlock}>
              <SectionLabel style={styles.blockLabel}>Choose a role</SectionLabel>
              <View style={styles.rolesGrid}>
                {INTERVIEW_ROLES.map((r) => {
                  const selected = r === role;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.roleCard,
                        selected ? styles.roleCardSelected : styles.roleCardIdle,
                        pressed && styles.pressed,
                      ]}>
                      <Feather
                        name={ROLE_ICON[r]}
                        size={16}
                        color={selected ? Pastel.lilacInk : MUTED_ICON}
                      />
                      <Text
                        numberOfLines={2}
                        style={[styles.roleText, selected ? styles.roleTextSelected : styles.roleTextIdle]}>
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* CTA hitam terpaku di bawah, dengan pudaran putih di atasnya */}
      <View style={styles.footer} pointerEvents="box-none">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0)', '#FFFFFF']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['bottom']}>
          <View style={styles.footerInner}>
            <PrimaryButton
              label="Start interview"
              icon="arrow-right"
              disabled={!role}
              onPress={() =>
                role &&
                router.push({ pathname: '/conversation', params: { mode: 'interview', role } })
              }
            />
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HeroBg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },

  hero: { backgroundColor: HeroBg, paddingBottom: 30, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(205,238,219,0.10)',
  },
  dot: {
    position: 'absolute',
    top: 46,
    right: 54,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: Pastel.lilac,
    zIndex: 3,
    shadowColor: Pastel.lilac,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  breathe: {
    position: 'absolute',
    top: 96,
    right: 22,
    zIndex: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Pastel.mint,
    transform: [{ rotate: '4deg' }],
    shadowColor: Pastel.mint,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  breatheText: { fontSize: 13, fontWeight: '700', color: Pastel.mintInk },
  backRow: { paddingHorizontal: 20, paddingTop: 8, zIndex: 2 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  heroText: { paddingHorizontal: 24, paddingTop: 18, zIndex: 2 },
  title: { fontSize: 27, lineHeight: 31, fontWeight: '800', letterSpacing: -0.7, color: '#FFFFFF' },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.68)',
    marginTop: 9,
    maxWidth: 260,
  },

  sheet: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -26,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 120,
    gap: 22,
  },

  howBlock: { gap: 12 },
  roleBlock: { gap: 11 },
  blockLabel: { paddingLeft: 2 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howText: { flex: 1, fontSize: 14.5, fontWeight: '500', color: Ink },

  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  roleCard: {
    flexGrow: 1,
    flexBasis: '46%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleCardIdle: { backgroundColor: '#FFFFFF', borderColor: HairlineBorder },
  roleCardSelected: { backgroundColor: Pastel.lilac, borderColor: Pastel.lilac },
  roleText: { flexShrink: 1, fontSize: 13.5, lineHeight: 16 },
  roleTextIdle: { color: Ink, fontWeight: '500' },
  roleTextSelected: { color: ROLE_SELECTED_TEXT, fontWeight: '700' },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  footerInner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
