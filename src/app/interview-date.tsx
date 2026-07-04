import { useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
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
  const theme = useTheme();
  const [role, setRole] = useState<InterviewRole | null>(null);
  const [dateIso, setDateIso] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = role !== null && /^\d{4}-\d{2}-\d{2}$/.test(dateIso);

  async function handleSave() {
    if (!canSave || saving) return;
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
            ? 'That date is in the past — pick a future date.'
            : code === 'date_too_far'
              ? 'That is more than 90 days away — double-check the date.'
              : 'Invalid date. Use the format YYYY-MM-DD.',
        );
      } else {
        setError("Couldn't save, try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ThemedText type="link">← Back</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          When is your interview?
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Talkly builds a day-by-day prep plan counting down to the real thing.
        </ThemedText>

        <ThemedText type="smallBold" style={styles.label}>
          Role you&apos;re interviewing for
        </ThemedText>
        <View style={styles.chipRow}>
          {INTERVIEW_ROLES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[
                styles.chip,
                { backgroundColor: r === role ? AccentColor : theme.backgroundElement },
              ]}>
              <ThemedText type="small" style={r === role ? { color: AccentColorOn } : undefined}>
                {r}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="smallBold" style={styles.label}>
          Interview date
        </ThemedText>
        <View style={styles.chipRow}>
          {QUICK_OPTIONS.map((opt) => {
            const iso = isoPlusDays(opt.days);
            return (
              <Pressable
                key={opt.label}
                onPress={() => setDateIso(iso)}
                style={[
                  styles.chip,
                  { backgroundColor: iso === dateIso ? AccentColor : theme.backgroundElement },
                ]}>
                <ThemedText
                  type="small"
                  style={iso === dateIso ? { color: AccentColorOn } : undefined}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedView type="backgroundElement" style={styles.inputWrapper}>
          <TextInput
            placeholder="or type: YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            value={dateIso}
            onChangeText={setDateIso}
            autoCapitalize="none"
            style={[styles.input, { color: theme.text }]}
          />
        </ThemedView>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: AccentColor,
              opacity: !canSave ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}>
          {saving ? (
            <ActivityIndicator color={AccentColorOn} />
          ) : (
            <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
              Start my countdown
            </ThemedText>
          )}
        </Pressable>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backLink: { marginTop: Spacing.two },
  title: { marginTop: Spacing.two },
  label: { marginTop: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  inputWrapper: { borderRadius: 999, marginTop: Spacing.one },
  input: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 16 },
  error: { color: '#FF7A70' },
  saveButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
