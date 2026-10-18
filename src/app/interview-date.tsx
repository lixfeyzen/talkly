import { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Chip, PrimaryButton, SectionLabel, Placeholder } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, HairlineBorder, Danger, Radius, Font } from '@/constants/theme';
import { INTERVIEW_ROLES, type InterviewRole } from '@/lib/interviews/api';
import { setInterviewPlan } from '@/lib/interview-plan/api';
import { ApiError } from '@/lib/api/client';

// Set tanggal interview nyata + role -> home menampilkan countdown + tugas
// harian. Pilihan cepat (+N hari) menutup mayoritas kasus; input manual
// YYYY-MM-DD untuk tanggal spesifik.

const QUICK_OPTIONS = [
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
];

function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InterviewDateScreen() {
  const [role, setRole] = useState<InterviewRole | null>(null);
  const [dateIso, setDateIso] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Error INLINE (mockup "05 · inline error"): tanggal lampau ditandai saat
  // diketik, tanpa menunggu server. Perbandingan string aman utk format ISO.
  const isFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(dateIso);
  const isPast = isFormatValid && dateIso < isoPlusDays(0);
  const shownError = error ?? (isPast ? 'That date has passed. Pick a day in the future.' : null);
  const canSave = role !== null && isFormatValid && !isPast;

  async function handleSave() {
    if (saving) return;
    // Tombol selalu aktif (desain final): sebutkan apa yang kurang.
    if (!canSave) {
      if (role === null) setError('Pick a role first.');
      else if (!isPast) setError('Pick when your interview is, or type a date as YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setInterviewPlan(dateIso, role!);
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const code = (err.body as { error?: string } | null)?.error;
        setError(
          code === 'date_in_past'
            ? 'That date has passed. Pick a day in the future.'
            : code === 'date_too_far'
              ? 'That is more than 90 days away. Double-check the date.'
              : 'Invalid date. Use the format YYYY-MM-DD.',
        );
      } else {
        setError("Couldn't save, try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const inputBorder = shownError ? Danger : focused ? Ink : 'transparent';

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.navRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.backTile, { opacity: pressed ? 0.6 : 1 }]}>
              <Feather name="chevron-left" size={18} color={Ink} />
            </Pressable>
            <Text style={styles.navTitle}>Interview date</Text>
            <View style={styles.navSpacer} />
          </View>

          <Text style={styles.title}>When is your interview?</Text>
          <Text style={styles.subtitle}>
            I will set a gentle countdown and shape each day&apos;s practice around it.
          </Text>

          <SectionLabel style={styles.sectionLabel}>Role</SectionLabel>
          <View style={styles.chipRow}>
            {INTERVIEW_ROLES.map((r) => (
              <Chip
                key={r}
                label={r}
                selected={r === role}
                pastel="lilac"
                onPress={() => setRole(r)}
              />
            ))}
          </View>

          <SectionLabel style={styles.sectionLabel}>When</SectionLabel>
          <View style={styles.whenGrid}>
            {QUICK_OPTIONS.map((opt) => {
              const iso = isoPlusDays(opt.days);
              const selected = iso === dateIso;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setDateIso(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.whenCard,
                    selected && styles.whenCardSelected,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <Text style={[styles.whenText, selected && styles.whenTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel style={styles.sectionLabel}>Or pick an exact date</SectionLabel>
          <View style={[styles.inputRow, { borderColor: inputBorder }]}>
            <Feather name="calendar" size={18} color="#60646C" />
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Placeholder}
              value={dateIso}
              onChangeText={(t) => {
                setDateIso(t);
                if (error) setError(null); // error server basi hilang saat mengetik ulang
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="none"
              style={styles.input}
            />
            {shownError && <Feather name="alert-circle" size={18} color={Danger} />}
          </View>

          {shownError && (
            <View style={styles.alertRow}>
              <Feather name="alert-circle" size={14} color={Danger} />
              <Text style={styles.alertText}>{shownError}</Text>
            </View>
          )}

          <PrimaryButton
            label="Start my countdown"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  backTile: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontFamily: Font.bold, color: Ink },
  navSpacer: { width: 38, height: 38 },
  title: {
    fontSize: 26,
    lineHeight: 29,
    fontFamily: Font.extrabold,
    letterSpacing: -0.7,
    color: Ink,
    marginTop: Spacing.three,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#60646C',
    fontFamily: Font.medium,
    marginTop: Spacing.two,
  },
  sectionLabel: { marginTop: Spacing.four, marginBottom: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  whenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  whenCard: {
    flexGrow: 1,
    flexBasis: '46%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    backgroundColor: '#FFFFFF',
  },
  whenCardSelected: { backgroundColor: Ink, borderColor: Ink },
  whenText: { fontSize: 14, fontFamily: Font.semibold, color: Ink },
  whenTextSelected: { color: '#FFFFFF', fontFamily: Font.bold },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 50,
    paddingHorizontal: 15,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: '#F2F3F5',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: Font.semibold,
    color: Ink,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: Spacing.two,
    paddingLeft: 2,
  },
  alertText: { fontSize: 13, fontFamily: Font.semibold, color: Danger },
  saveButton: { marginTop: Spacing.four },
});
