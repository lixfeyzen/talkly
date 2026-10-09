import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, StatTile, SectionLabel, GhostButton, BottomNav, EmptyState } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Pastel, HairlineBorder, Radius, Success } from '@/constants/theme';
import { fetchDashboard, categoryLabel, type DashboardData } from '@/lib/dashboard/api';
import { apiFetch } from '@/lib/api/client';
import { WEEKLY_CHALLENGE_ENABLED } from '@/lib/features/v1';

// Weekly challenges progress type (match backend /api/challenges/progress)
interface ChallengeProgress {
  totalWeeks: number;
  completedCount: number;
  currentWeek: number;
  nextLockedWeek: number;
}

async function fetchChallengeProgress(): Promise<ChallengeProgress | null> {
  try {
    return await apiFetch<ChallengeProgress>('/api/challenges/progress', { auth: true });
  } catch {
    return null;
  }
}

// Tone lilac-dalam untuk kartu readiness (dari mockup) — lebih pekat dari
// Pastel.lilacInk supaya angka besar & verdict kontras di atas lilac.
const LILAC_DEEP = '#2A1D45';
const LILAC_MUTED = '#6E5C93';
// Abu redup untuk label mini & teks coret (dari mockup, senada ui.tsx).
const MUTED = '#8B8F98';
// Tone cream sekunder (subtitle kartu trajectory / chevron) — dari mockup.
const CREAM_MUTED = '#7A6B3A';

function formatLastPracticed(iso: string | null): string {
  if (!iso) return 'Never';
  // Selisih HARI KALENDER (tengah-malam lokal), bukan jendela 24 jam --
  // latihan kemarin 22:00 dilihat pagi ini harus "Yesterday", bukan "Today".
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const when = new Date(iso);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(when)) / 86_400_000);
  // Hari terdekat diberi JAM (gaya mockup "Today, 9:12") -- data timestamp
  // memang ada, hanya presentasinya yang diperkaya.
  const hm = `${when.getHours()}:${String(when.getMinutes()).padStart(2, '0')}`;
  if (diffDays <= 0) return `Today, ${hm}`;
  if (diffDays === 1) return `Yesterday, ${hm}`;
  return `${diffDays} days ago`;
}

// Verdict tenang & ringkas dari skor readiness (presentasi saja, tidak mengubah
// data). Ambang 80/60 dipertahankan; teks dipendekkan agar sebaris dgn skor.
function readinessVerdict(score: number): string {
  if (score >= 80) return 'Review your answers';
  if (score >= 60) return 'Keep practising';
  return 'Getting started';
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    if (WEEKLY_CHALLENGE_ENABLED) fetchChallengeProgress().then(setChallengeProgress);
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

          {!hasData ? (
            <EmptyState
              title="No progress yet"
              subtitle="Finish one conversation and your streak, weak spots, and corrections show up here."
              ctaLabel="Start practicing"
              onCta={() => router.push('/')}
            />
          ) : (
            <>
              {/* Ringkasan aktivitas */}
              <Text style={styles.mutedLabel}>Activity totals across all sessions</Text>
              <View style={styles.statRow}>
                <StatTile pastel="pink" icon="zap" value={data.streak.currentStreak} label="Day streak" />
                <StatTile pastel="ice" icon="message-circle" value={data.activity.totalSessions} label="Sessions" />
                <StatTile pastel="cream" icon="edit-3" value={data.activity.totalCorrections} label="Corrections" />
              </View>

              {/* Weekly Challenges — posisi #2, progress bar + CTA minggu ini */}
              {WEEKLY_CHALLENGE_ENABLED && challengeProgress && (
                <Pressable
                  onPress={() => router.push('/weekly-challenge')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                  <Card style={styles.challengeCard}>
                    <View style={styles.challengeHeader}>
                      <View style={styles.challengeHeaderLeft}>
                        <View style={styles.challengeTile}>
                          <Feather name="calendar" size={18} color={Pastel.iceInk} />
                        </View>
                        <View style={styles.flex1}>
                          <Text style={styles.challengeTitle}>Weekly challenges</Text>
                          <Text style={styles.challengeSub}>
                            {challengeProgress.completedCount} of {challengeProgress.totalWeeks} completed
                          </Text>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={18} color={MUTED} />
                    </View>
                    <View style={styles.challengeProgressTrack}>
                      <View
                        style={[
                          styles.challengeProgressFill,
                          { width: `${(challengeProgress.completedCount / challengeProgress.totalWeeks) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.challengeThisWeek}>
                      This week: Week {challengeProgress.currentWeek}
                    </Text>
                  </Card>
                </Pressable>
              )}

              {/* Last practiced */}
              <Card style={styles.infoCard}>
                <View style={styles.infoTile}>
                  <Feather name="clock" size={18} color={Ink} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.miniLabel, styles.mutedLabel]}>Last practiced</Text>
                  <Text style={styles.infoValue}>{formatLastPracticed(data.activity.lastPracticedAt)}</Text>
                </View>
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
                  <Card style={styles.readinessCard}>
                    <View style={styles.flex1}>
                      <Text style={[styles.miniLabel, styles.lilacLabel]}>Latest practice report</Text>
                      <View style={styles.readinessScoreRow}>
                        <Text style={styles.readinessScore}>{data.latestReadiness.score}</Text>
                        <Text style={styles.readinessOutOf}>/ 100</Text>
                        <Text style={styles.readinessVerdict} numberOfLines={1}>
                          {readinessVerdict(data.latestReadiness.score)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.readinessChevron}>
                      <Feather name="chevron-right" size={16} color={Pastel.lilacInk} />
                    </View>
                  </Card>
                </Pressable>
              )}

              {/* Readiness Trajectory */}
              <Pressable
                onPress={() => router.push('/trajectory')}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <Card style={styles.trajectoryCard}>
                  <View style={styles.trajectoryTile}>
                    <Feather name="trending-up" size={18} color={Pastel.creamInk} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.trajectoryTitle}>Practice history</Text>
                    <Text style={styles.trajectorySub}>See your trajectory over time</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={CREAM_MUTED} />
                </Card>
              </Pressable>

              {/* Kelemahan utama */}
              {data.topWeaknesses.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel style={styles.sectionPad}>Correction focus · last 28 days</SectionLabel>
                  {data.topWeaknesses.map((w) => (
                    <View key={w.category} style={styles.weaknessRow}>
                      <Text style={styles.weaknessTitle} numberOfLines={1}>
                        {categoryLabel(w.category)}
                      </Text>
                      <View style={styles.weaknessBadge}>
                        <Text style={styles.weaknessBadgeText}>{w.occurrenceCount}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Contoh koreksi terbaru */}
              {data.recentCorrections.length > 0 && (
                <View style={styles.section}>
                  <SectionLabel style={styles.sectionPad}>Latest corrections</SectionLabel>
                  {data.recentCorrections.map((c, i) => (
                    <View key={i} style={styles.correctionRow}>
                      <Text style={styles.correctionOriginal} numberOfLines={1}>
                        {c.originalText}
                      </Text>
                      <Feather name="arrow-right" size={15} color={MUTED} />
                      <Text style={styles.correctionFixed} numberOfLines={1}>
                        {c.correctedText}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.navSafe}>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  errorText: { color: Ink, fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  navSafe: { backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.four, gap: 10 },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.6, color: Ink },

  flex1: { flex: 1 },

  // Stat tiles (grid 3, ikon + angka + label — via kit StatTile)
  statRow: { flexDirection: 'row', gap: 10 },

  // Label mini di dalam kartu (11px, dari mockup)
  miniLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  mutedLabel: { color: MUTED },
  lilacLabel: { color: LILAC_MUTED },

  // Last practiced (kartu putih + tile ikon jam)
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10, paddingHorizontal: 14 },
  infoTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: { fontSize: 14.5, fontWeight: '600', color: Ink, marginTop: 2 },

  // Latest readiness (kartu lilac datar, skor + verdict sebaris, chevron bulat)
  readinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: Pastel.lilac,
    borderColor: 'transparent',
    paddingVertical: 11,
    paddingHorizontal: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  readinessScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 5 },
  readinessScore: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -1,
    color: LILAC_DEEP,
    fontVariant: ['tabular-nums'],
  },
  readinessOutOf: { fontSize: 14, fontWeight: '600', color: LILAC_MUTED },
  readinessVerdict: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: LILAC_DEEP, marginLeft: 4 },
  readinessChevron: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // "Am I getting better?" (kartu cream datar + tile ikon + chevron)
  trajectoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Pastel.cream,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowOpacity: 0,
    elevation: 0,
  },
  trajectoryTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trajectoryTitle: { fontSize: 15, fontWeight: '700', color: Pastel.creamInk },
  trajectorySub: { fontSize: 13, color: CREAM_MUTED, marginTop: 1 },

  // Weekly challenges card
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Pastel.ice,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowOpacity: 0,
    elevation: 0,
  },
  challengeTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: { fontSize: 15, fontWeight: '700', color: Pastel.iceInk },
  challengeSub: { fontSize: 13, color: CREAM_MUTED, marginTop: 1 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  challengeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1 },
  challengeProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: Pastel.iceInk,
    borderRadius: 3,
  },
  challengeThisWeek: { fontSize: 13, fontWeight: '600', color: Pastel.iceInk, marginTop: 8 },

  // Seksi daftar (label + baris, gap 9 spt mockup)
  section: { gap: 9 },
  sectionPad: { paddingLeft: 2 },

  // Top weaknesses row
  weaknessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  weaknessTitle: { flex: 1, fontSize: 14.5, fontWeight: '600', color: Ink },
  weaknessBadge: {
    minWidth: 26,
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radius.pill,
    backgroundColor: '#F2F3F5',
  },
  weaknessBadgeText: { fontSize: 13, fontWeight: '700', color: '#60646C', fontVariant: ['tabular-nums'] },

  // Recent corrections row (sebaris: coret -> panah -> hijau)
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  correctionOriginal: {
    flexShrink: 1,
    fontSize: 13,
    color: MUTED,
    textDecorationLine: 'line-through',
    textDecorationColor: 'rgba(217,45,32,0.5)',
  },
  correctionFixed: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: Success },
});
