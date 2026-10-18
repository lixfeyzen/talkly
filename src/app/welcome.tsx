import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AuthButton, AuthPalette, BrandRow, GlowBackdrop } from '@/components/auth/auth-layout';
import { Spacing, MaxContentWidth, Brand, Font } from '@/constants/theme';

// Layar pertama untuk orang yang belum masuk (desain final ungu, 2026-10-18).
// Tugasnya satu: dalam beberapa detik orang paham Talkly melatih interview
// dengan bicara, memperbaiki kalimatnya, dan mengingat kelemahannya. Contoh
// koreksi di kartu memakai aturan yang sama dengan app: kata salah dicoret
// abu, kata benar distabilo ungu muda.
export default function WelcomeScreen() {
  return (
    <View style={styles.page}>
      <GlowBackdrop />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
          <View style={styles.inner}>
            <BrandRow />

            {/* Judul dipecah per baris supaya stabilo pada "ready." berupa kotak
                sendiri yang tidak menimpa baris di atasnya (latar Text bersarang
                di RN memenuhi seluruh tinggi baris). */}
            <View
              style={styles.titleBlock}
              accessible
              accessibilityRole="header"
              accessibilityLabel="Walk into your interview ready.">
              <Text style={styles.title}>Walk into your</Text>
              <View style={styles.titleRow}>
                <Text style={styles.title}>interview </Text>
                <View style={styles.titleMark}>
                  <Text style={[styles.title, styles.titleMarkText]}>ready.</Text>
                </View>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Practice real interview questions out loud. Talkly fixes what you say and remembers
              your weak spots.
            </Text>

            <View style={styles.card} accessibilityLabel="Example correction">
              <Text style={styles.label}>INTERVIEWER</Text>
              <Text style={styles.question}>Tell me about your last job.</Text>
              <Text style={styles.answer}>
                I <Text style={styles.strike}>am work</Text>{' '}
                <Text style={styles.highlight}>have worked</Text> at a bank for three years.
              </Text>
              <View style={styles.noteRow}>
                <Text style={styles.chip}>Tense</Text>
                <Text style={styles.note}>Saved to your weak spots</Text>
              </View>
            </View>

            <View style={styles.spacer} />

            <AuthButton label="Get started" onPress={() => router.push('/register')} />
            <View style={styles.footRow}>
              <Text style={styles.footText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/login')} hitSlop={Spacing.two} accessibilityRole="link">
                <Text style={styles.footAction}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Brand.paper },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  titleBlock: { marginTop: Spacing.five + Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  title: {
    fontFamily: Font.extrabold,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.7,
    color: AuthPalette.textPrimary,
  },
  titleMark: {
    backgroundColor: Brand.highlight,
    borderRadius: 8,
    paddingHorizontal: 5,
    marginVertical: 3,
  },
  titleMarkText: { lineHeight: 36 },
  highlight: { backgroundColor: Brand.highlight, color: AuthPalette.textPrimary },
  subtitle: {
    marginTop: Spacing.three,
    fontFamily: Font.medium,
    fontSize: 15,
    lineHeight: 22,
    color: AuthPalette.textSecondary,
  },
  card: {
    marginTop: Spacing.five,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ECECEE',
    padding: Spacing.three + 4,
    gap: Spacing.two + 2,
    shadowColor: Brand.violetDeep,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  label: { fontFamily: Font.bold, fontSize: 11.5, letterSpacing: 0.8, color: AuthPalette.textSecondary },
  question: { fontFamily: Font.semibold, fontSize: 15.5, lineHeight: 22, color: AuthPalette.textPrimary },
  answer: { fontFamily: Font.medium, fontSize: 15.5, lineHeight: 25, color: AuthPalette.textPrimary },
  strike: { color: Brand.strike, textDecorationLine: 'line-through' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  chip: {
    fontFamily: Font.extrabold,
    fontSize: 11,
    color: AuthPalette.textPrimary,
    backgroundColor: Brand.selectedBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  note: { fontFamily: Font.semibold, fontSize: 12.5, color: AuthPalette.textSecondary },
  spacer: { flexGrow: 1, minHeight: Spacing.five },
  footRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footText: { fontFamily: Font.medium, fontSize: 14, color: AuthPalette.textSecondary },
  footAction: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: AuthPalette.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: Brand.violetLight,
  },
});
