import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, StatTile, SectionLabel, GhostButton, BottomNav } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Pastel, HairlineBorder, Radius } from '@/constants/theme';
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

// Verdict tenang dari skor readiness (presentasi saja, tidak mengubah data).
function readinessVerdict(score: number): string {
  if (score >= 80) return 'Strong. You are close to interview ready.';
  if (score >= 60) return 'Getting there. Keep practicing.';
  return 'Early days. A few more sessions will help.';
}

export default function DashboardScreen() {
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
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={Ink} />
        </View>
      </GradientBackground>
    );
  }

  if (error || !data) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={styles.errorText}>We could not load your progress. Try again later.</Text>
            <GhostButton label="Go back" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const hasData = data.activity.totalSessions > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Your progress</Text>

          {!hasData && (
            <Card>
              <Text style={styles.emptyText}>
                No practice data yet. Finish one conversation and your weak spots and progress
                will show up here.
              </Text>
            </Card>
          )}

          {/* Ringkasan aktivitas */}
          <View style={styles.statRow}>
            <StatTile pastel="pink" value={data.streak.currentStreak} label="Day streak" />
            <StatTile pastel="ice" value={data.activity.totalSessions} label="Sessions" />
            <StatTile pastel="lilac" value={data.activity.totalCorrections} label="Corrections" />
          </View>

          {/* Last practiced */}
          <Card style={styles.lastCard}>
            <SectionLabel>Last practiced</SectionLabel>
            <Text style={styles.lastValue}>{formatLastPracticed(data.activity.lastPracticedAt)}</Text>
          </Card>

          {/* Skor mock interview terakhir (fitur #6) */}
          {data.latestReadiness && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/interview-report',
                  params: { sessionId: data.latestReadiness!.sessionId },
                })
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <Card style={styles.lilacCard}>
                <View style={styles.readinessHead}>
                  <SectionLabel style={styles.lilacLabel}>Latest readiness</SectionLabel>
                  <Feather name="chevron-right" size={18} color={Pastel.lilacInk} />
                </View>
                <View style={styles.readinessScoreRow}>
                  <Text style={styles.readinessScore}>{data.latestReadiness.score}</Text>
                  <Text style={styles.readinessOutOf}>/ 100</Text>
                </View>
                <Text style={styles.readinessVerdict}>
                  {readinessVerdict(data.latestReadiness.score)}
                </Text>
              </Card>
            </Pressable>
          )}

          {/* Readiness Trajectory */}
          <Pressable
            onPress={() => router.push('/trajectory')}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Card style={styles.creamCard}>
              <View style={styles.readinessHead}>
                <SectionLabel style={styles.creamLabel}>Am I getting better?</SectionLabel>
                <Feather name="trending-up" size={18} color={Pastel.creamInk} />
              </View>
              <Text style={styles.creamText}>See your trajectory over time.</Text>
            </Card>
          </Pressable>

          {/* Kelemahan utama */}
          {data.topWeaknesses.length > 0 && (
            <View style={styles.section}>
              <SectionLabel>Top weaknesses</SectionLabel>
              <View style={styles.rows}>
                {data.topWeaknesses.map((w) => (
                  <View key={w.category} style={styles.weaknessRow}>
                    <Text style={styles.weaknessTitle} numberOfLines={1}>
                      {categoryLabel(w.category)}
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{w.occurrenceCount}x</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contoh koreksi terbaru */}
          {data.recentCorrections.length > 0 && (
            <View style={styles.section}>
              <SectionLabel>Recent corrections</SectionLabel>
              <View style={styles.rows}>
                {data.recentCorrections.map((c, i) => (
                  <Card key={i} style={styles.correctionCard}>
                    <Text style={styles.correctionCategory}>{categoryLabel(c.category)}</Text>
                    <Text style={styles.correctionOriginal}>{c.originalText}</Text>
                    <View style={styles.correctionFixedRow}>
                      <Feather name="arrow-right" size={14} color={Pastel.mintInk} />
                      <Text style={styles.correctionFixed}>{c.correctedText}</Text>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <BottomNav
          active="progress"
          onHome={() => router.push('/')}
          onSettings={() => router.push('/settings')}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  errorText: { color: Ink, fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.three },
  title: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: Ink, marginBottom: Spacing.one },
  emptyText: { fontSize: 15, lineHeight: 21, color: '#60646C', fontWeight: '500' },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  lastCard: { gap: Spacing.two },
  lastValue: { fontSize: 20, fontWeight: '700', color: Ink },
  lilacCard: { backgroundColor: Pastel.lilac, borderColor: 'transparent', gap: Spacing.two },
  lilacLabel: { color: Pastel.lilacInk },
  readinessHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readinessScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  readinessScore: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800',
    color: Pastel.lilacInk,
    fontVariant: ['tabular-nums'],
  },
  readinessOutOf: { fontSize: 16, fontWeight: '700', color: Pastel.lilacInk, opacity: 0.7 },
  readinessVerdict: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: Pastel.lilacInk },
  creamCard: { backgroundColor: Pastel.cream, borderColor: 'transparent', gap: Spacing.two },
  creamLabel: { color: Pastel.creamInk },
  creamText: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: Pastel.creamInk },
  section: { gap: Spacing.two, marginTop: Spacing.one },
  rows: { gap: Spacing.two },
  weaknessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 56,
  },
  weaknessTitle: { flex: 1, color: Ink, fontSize: 15, fontWeight: '600' },
  countBadge: {
    backgroundColor: '#F2F3F5',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  countText: { color: Ink, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  correctionCard: { gap: Spacing.one },
  correctionCategory: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#8B8F98',
    marginBottom: 2,
  },
  correctionOriginal: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8B8F98',
    textDecorationLine: 'line-through',
  },
  correctionFixedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  correctionFixed: { flex: 1, fontSize: 14, lineHeight: 20, color: Pastel.mintInk, fontWeight: '700' },
});
