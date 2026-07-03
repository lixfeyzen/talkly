import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, CardShadow } from '@/constants/theme';
import { fetchDashboard, categoryLabel, type DashboardData } from '@/lib/dashboard/api';

function formatLastPracticed(iso: string | null): string {
  if (!iso) return 'Never';
  // Selisih HARI KALENDER (tengah-malam lokal), bukan jendela 24 jam --
  // latihan kemarin 22:00 dilihat pagi ini harus "Yesterday", bukan "Today".
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn’t load your data. Try again later.
        </ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ThemedText type="link">← Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const hasData = data.activity.totalSessions > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="link">← Back</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Your progress
          </ThemedText>

          {!hasData && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="default" themeColor="textSecondary">
                No practice data yet. Finish one conversation session and your
                weak spots & progress will show up here.
              </ThemedText>
            </ThemedView>
          )}

          {/* Ringkasan aktivitas */}
          <ThemedView style={styles.statRow}>
            <ThemedView type="backgroundElement" style={styles.statBox}>
              <ThemedText type="title" style={styles.statNumber}>
                {data.streak.currentStreak > 0 ? `🔥${data.streak.currentStreak}` : '0'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Day streak
              </ThemedText>
              {data.streak.longestStreak > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Longest: {data.streak.longestStreak}
                </ThemedText>
              )}
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.statBox}>
              <ThemedText type="title" style={styles.statNumber}>
                {data.activity.totalSessions}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Practice sessions
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.statBox}>
              <ThemedText type="title" style={styles.statNumber}>
                {data.activity.totalCorrections}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Corrections received
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Last practiced
            </ThemedText>
            <ThemedText type="smallBold">
              {formatLastPracticed(data.activity.lastPracticedAt)}
            </ThemedText>
          </ThemedView>

          {/* Skor mock interview terakhir (fitur #6) */}
          {data.latestReadiness && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/interview-report',
                  params: { sessionId: data.latestReadiness!.sessionId },
                })
              }>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="small" themeColor="textSecondary">
                  🎤 Latest interview readiness
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: AccentColor }}>
                  {data.latestReadiness.score}/100 — tap to see the report
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}

          {/* Kelemahan utama */}
          {data.topWeaknesses.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Your top weaknesses
              </ThemedText>
              {data.topWeaknesses.map((w) => (
                <ThemedView key={w.category} type="backgroundElement" style={styles.weaknessRow}>
                  <ThemedText type="default">{categoryLabel(w.category)}</ThemedText>
                  <ThemedView style={[styles.countBadge, { backgroundColor: AccentColor }]}>
                    <ThemedText type="smallBold" style={styles.countText}>
                      {w.occurrenceCount}×
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* Contoh koreksi terbaru */}
          {data.recentCorrections.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Recent corrections
              </ThemedText>
              {data.recentCorrections.map((c, i) => (
                <ThemedView key={i} type="backgroundElement" style={styles.card}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.correctionCategory}>
                    {categoryLabel(c.category)}
                  </ThemedText>
                  <ThemedText type="default" style={{ color: theme.textSecondary }}>
                    {c.originalText}
                  </ThemedText>
                  <ThemedText type="default" style={{ color: AccentColor }}>
                    → {c.correctedText}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, gap: Spacing.three },
  backLink: { marginBottom: Spacing.one },
  title: { marginBottom: Spacing.two },
  statRow: { flexDirection: 'row', gap: Spacing.three, backgroundColor: 'transparent' },
  statBox: {
    flex: 1,
    ...CardShadow,
    borderRadius: 20,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  statNumber: { fontSize: 36, lineHeight: 42 },
  card: {
    ...CardShadow,
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: { gap: Spacing.two, marginTop: Spacing.two, backgroundColor: 'transparent' },
  sectionTitle: { marginBottom: Spacing.one },
  weaknessRow: {
    ...CardShadow,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  countBadge: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  countText: { color: '#ffffff' },
  correctionCategory: { marginBottom: Spacing.half },
});
