import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AuthButton, AuthPalette, GlowBackdrop } from '@/components/auth/auth-layout';
import { Spacing, MaxContentWidth, Brand, Font, Placeholder } from '@/constants/theme';
import { updateProfile, NATIVE_LANGUAGE_OPTIONS } from '@/lib/auth/api';
import { NetworkError } from '@/lib/api/client';
import { INTERVIEW_ROLES, type InterviewRole } from '@/lib/interviews/api';
import { setInterviewPlan } from '@/lib/interview-plan/api';
import { localIsoDate } from '@/lib/dates';

// Onboarding sekali setelah daftar, satu pertanyaan per layar (desain final
// ungu, 2026-10-18): 1) nama panggilan (opsional) untuk sapaan "Hi Mateo",
// 2) bahasa sehari-hari untuk penjelasan koreksi, 3) posisi dan tanggal
// interview (opsional), karena latihan per role dan hitung mundur bergantung
// padanya. Sesudahnya pengguna langsung diarahkan ke mock interview pertama,
// bukan ke Home yang penuh pilihan (audit alur 2026-10-18).
const STEPS = 3;

const WHEN_OPTIONS = [
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
] as const;


export default function OnboardingScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<InterviewRole | null>(null);
  const [whenDays, setWhenDays] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleLanguageNext() {
    if (!selected) {
      setError('Pick a language to continue.');
      return;
    }
    setError(null);
    setStep(3);
  }

  // withPlan=false: "Not sure yet", posisi dan tanggal dilewati.
  async function handleFinish(withPlan: boolean) {
    if (loading || !selected) return;
    if (withPlan && (!role || whenDays === null)) {
      setError(!role ? 'Pick a role, or choose Not sure yet.' : 'Pick when your interview is, or choose Not sure yet.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const trimmed = name.trim();
      await updateProfile(
        trimmed ? { nativeLanguage: selected, name: trimmed } : { nativeLanguage: selected },
      );
      if (withPlan && role && whenDays !== null) {
        await setInterviewPlan(localIsoDate(whenDays), role);
      }
      // Langsung ke mock interview pertama, menggantikan onboarding supaya
      // tombol kembali tidak membuka onboarding lagi (kembali menuju Home).
      router.replace({ pathname: '/interview', params: withPlan && role ? { role } : {} });
    } catch (err) {
      if (err instanceof NetworkError) {
        setError('Can’t reach the server. Try again in a moment.');
      } else {
        setError('Couldn’t save, try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <GlowBackdrop />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.progressBar, i < step && styles.progressOn]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            {step === 1 ? (
              <>
                <Text style={styles.title} accessibilityRole="header">
                  First, what should I call you?
                </Text>
                <Text style={styles.subtitle}>I’ll use it to greet you before each practice.</Text>
                <TextInput
                  placeholder="Your first name"
                  placeholderTextColor={Placeholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                  maxLength={60}
                  returnKeyType="next"
                  onSubmitEditing={() => setStep(2)}
                  style={styles.nameInput}
                />
                <View style={styles.spacer} />
                <AuthButton label="Continue" onPress={() => setStep(2)} />
                <Pressable
                  onPress={() => {
                    setName('');
                    setStep(2);
                  }}
                  hitSlop={Spacing.two}
                  accessibilityRole="button"
                  style={styles.skip}>
                  <Text style={styles.skipText}>Maybe later</Text>
                </Pressable>
              </>
            ) : step === 2 ? (
              <>
                <Text style={styles.title} accessibilityRole="header">
                  What language do you speak every day?
                </Text>
                <Text style={styles.subtitle}>
                  I’ll explain your corrections in this language. You can change it anytime.
                </Text>
                <View style={styles.grid}>
                  {NATIVE_LANGUAGE_OPTIONS.map((opt) => {
                    const isSel = opt.value === selected;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setSelected(opt.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSel }}
                        style={[styles.option, isSel && styles.optionSel]}>
                        <Text style={styles.optionText}>{opt.label}</Text>
                        <View style={[styles.tick, isSel && styles.tickSel]} />
                      </Pressable>
                    );
                  })}
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.spacer} />
                <AuthButton label="Continue" onPress={handleLanguageNext} />
                <Pressable
                  onPress={() => setStep(1)}
                  hitSlop={Spacing.two}
                  accessibilityRole="button"
                  style={styles.skip}>
                  <Text style={styles.skipText}>Back</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title} accessibilityRole="header">
                  What role is your interview for?
                </Text>
                <Text style={styles.subtitle}>
                  I’ll pick questions for this role and count down to the day.
                </Text>
                <View style={styles.grid}>
                  {INTERVIEW_ROLES.map((r) => {
                    const isSel = r === role;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setRole(r)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSel }}
                        style={[styles.option, isSel && styles.optionSel]}>
                        <Text style={styles.optionText}>{r}</Text>
                        <View style={[styles.tick, isSel && styles.tickSel]} />
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.groupLabel}>WHEN IS IT?</Text>
                <View style={styles.gridTight}>
                  {WHEN_OPTIONS.map((o) => {
                    const isSel = o.days === whenDays;
                    return (
                      <Pressable
                        key={o.days}
                        onPress={() => setWhenDays(o.days)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSel }}
                        style={[styles.option, isSel && styles.optionSel]}>
                        <Text style={styles.optionText}>{o.label}</Text>
                        <View style={[styles.tick, isSel && styles.tickSel]} />
                      </Pressable>
                    );
                  })}
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.spacer} />
                <AuthButton
                  label="Start my first mock interview"
                  onPress={() => handleFinish(true)}
                  loading={loading}
                />
                <Pressable
                  onPress={() => handleFinish(false)}
                  hitSlop={Spacing.two}
                  accessibilityRole="button"
                  style={styles.skip}>
                  <Text style={styles.skipText}>Not sure yet</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Brand.paper },
  flex: { flex: 1 },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  progressBar: { flex: 1, height: 5, borderRadius: 9, backgroundColor: '#E6E3EE' },
  progressOn: { backgroundColor: Brand.violet },
  scroll: { flexGrow: 1 },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  title: {
    fontFamily: Font.extrabold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
    color: AuthPalette.textPrimary,
  },
  subtitle: {
    marginTop: Spacing.two + 2,
    fontFamily: Font.medium,
    fontSize: 15,
    lineHeight: 22,
    color: AuthPalette.textSecondary,
  },
  nameInput: {
    marginTop: Spacing.four,
    backgroundColor: AuthPalette.inputBg,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontFamily: Font.medium,
    color: AuthPalette.inputText,
    outlineColor: Brand.violetLight,
  },
  grid: { marginTop: Spacing.four, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridTight: { marginTop: Spacing.two, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  groupLabel: {
    marginTop: Spacing.four,
    fontFamily: Font.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: AuthPalette.textSecondary,
  },
  option: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECECEE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionSel: { borderColor: Brand.violet, backgroundColor: Brand.selectedBg },
  optionText: { fontFamily: Font.bold, fontSize: 14.5, color: AuthPalette.textPrimary, flexShrink: 1 },
  tick: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#CFCFD4' },
  tickSel: { borderColor: Brand.violet, backgroundColor: Brand.violet },
  error: {
    marginTop: Spacing.three,
    color: AuthPalette.error,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Font.medium,
  },
  spacer: { flexGrow: 1, minHeight: Spacing.five },
  skip: { alignSelf: 'center', marginTop: Spacing.three, padding: Spacing.one },
  skipText: { fontFamily: Font.semibold, fontSize: 14, color: AuthPalette.textSecondary },
});
