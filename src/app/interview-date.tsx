import { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Chip, PrimaryButton, SectionLabel, Placeholder } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, HairlineBorder, Danger, Radius } from '@/constants/theme';
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
            ? 'That date is in the past. Pick a future date.'
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>When is your interview?</Text>
          <Text style={styles.subtitle}>
            I will set a gentle countdown and shape each day&apos;s practice around it.
          </Text>

          <SectionLabel style={styles.sectionLabel}>Role</SectionLabel>
          <View style={styles.chipRow}>
            {INTERVIEW_ROLES.map((r) => (
              <Chip key={r} label={r} selected={r === role} onPress={() => setRole(r)} />
            ))}
          </View>

          <SectionLabel style={styles.sectionLabel}>When</SectionLabel>
          <View style={styles.chipRow}>
            {QUICK_OPTIONS.map((opt) => {
              const iso = isoPlusDays(opt.days);
              return (
                <Chip
                  key={opt.label}
                  label={opt.label}
                  selected={iso === dateIso}
                  onPress={() => setDateIso(iso)}
                />
              );
            })}
          </View>

          <View style={styles.field}>
            <TextInput
              placeholder="Or pick an exact date (YYYY-MM-DD)"
              placeholderTextColor={Placeholder}
              value={dateIso}
              onChangeText={setDateIso}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton
            label="Start my countdown"
            onPress={handleSave}
            disabled={!canSave}
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
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.two },
  backText: { color: Ink, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: Ink, marginTop: Spacing.three },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#60646C',
    fontWeight: '500',
    marginTop: Spacing.two,
  },
  sectionLabel: { marginTop: Spacing.four, marginBottom: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  field: {
    backgroundColor: '#F2F3F5',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    marginTop: Spacing.two,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: Ink,
  },
  error: { color: Danger, fontSize: 14, fontWeight: '500', marginTop: Spacing.three },
  saveButton: { marginTop: Spacing.four },
});
