import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, CardShadow } from '@/constants/theme';
import { generateReport, type InterviewReportResponse } from '@/lib/interviews/api';
import { ApiError, NetworkError } from '@/lib/api/client';

// Rapor kesiapan interview (fitur #6). POST idempoten: rapor yang sudah ada
// dikembalikan server tanpa panggilan AI kedua.
export default function InterviewReportScreen() {
  const theme = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [data, setData] = useState<InterviewReportResponse | null>(null);
  // Tanpa sessionId = kondisi TURUNAN (bukan state) -- hindari setState
  // langsung di body effect (rule react-hooks/set-state-in-effect).
  const missingSession = !sessionId;
  const [loading, setLoading] = useState(!missingSession);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const error = missingSession ? 'Missing interview session.' : fetchError;

  useEffect(() => {
    if (!sessionId) return;
    generateReport(sessionId)
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 502) {
          setFetchError('The AI is having trouble generating your report. Try again in a moment.');
        } else if (err instanceof NetworkError) {
          setFetchError('Can’t reach the server. Try again in a moment.');
        } else {
          setFetchError('Couldn’t load your report, try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
        <ThemedText type="small" themeColor="textSecondary">
          Preparing your readiness report…
        </ThemedText>
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
          {error ?? 'Something went wrong.'}
        </ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ThemedText type="link">← Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const { report } = data;
  const dims = [
    { label: 'Grammar', d: report.dimensions.grammar },
    { label: 'Answer structure', d: report.dimensions.structure },
    { label: 'Content strength', d: report.dimensions.content },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.replace('/')} style={styles.backLink}>
            <ThemedText type="link">← Home</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Readiness report
          </ThemedText>

          {/* Skor keseluruhan */}
          <ThemedView type="backgroundElement" style={styles.scoreCard}>
            <ThemedText style={[styles.scoreNumber, { color: AccentColor }]}>
              {data.score}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              out of 100
            </ThemedText>
          </ThemedView>

          {/* Dimensi */}
          <ThemedView style={styles.section}>
            {dims.map(({ label, d }) => (
              <ThemedView key={label} type="backgroundElement" style={styles.dimCard}>
                <View style={styles.dimHeader}>
                  <ThemedText type="smallBold">{label}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: AccentColor }}>
                    {d.score}
                  </ThemedText>
                </View>
                <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(100, Math.max(0, d.score))}%`, backgroundColor: AccentColor },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {d.comment}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>

          {/* Terkuat / terlemah */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.ok}>
              💪 Strongest answer
            </ThemedText>
            <ThemedText type="small">{report.strongestAnswer.question}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {report.strongestAnswer.why}
            </ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={styles.warn}>
              🎯 Weakest answer
            </ThemedText>
            <ThemedText type="small">{report.weakestAnswer.question}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {report.weakestAnswer.why}
            </ThemedText>
          </ThemedView>

          {/* Fixes */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Fix these first
            </ThemedText>
            {report.topFixes.map((fix, i) => (
              <ThemedView key={i} type="backgroundElement" style={styles.card}>
                <ThemedText type="small">
                  {i + 1}. {fix}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>

          {/* Answer upgrades */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Stronger versions of your answers
            </ThemedText>
            {report.answerUpgrades.map((u, i) => (
              <ThemedView key={i} type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{u.question}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  You said: {u.original}
                </ThemedText>
                <ThemedText type="small" style={{ color: AccentColor }}>
                  Stronger: {u.upgraded}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, gap: Spacing.three },
  backLink: { marginBottom: Spacing.one },
  title: { marginBottom: Spacing.two },
  scoreCard: { ...CardShadow, borderRadius: 24, padding: Spacing.four, alignItems: 'center', gap: Spacing.one },
  scoreNumber: { fontSize: 64, lineHeight: 72, fontWeight: '800' },
  section: { gap: Spacing.two, marginTop: Spacing.two, backgroundColor: 'transparent' },
  sectionTitle: { marginBottom: Spacing.half },
  dimCard: { ...CardShadow, borderRadius: 20, padding: Spacing.three, gap: Spacing.two },
  dimHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  card: { ...CardShadow, borderRadius: 20, padding: Spacing.three, gap: Spacing.one },
  ok: { color: '#34C88A' },
  warn: { color: '#FF7A70' },
});
