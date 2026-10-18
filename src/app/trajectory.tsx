import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { GradientBackground } from '@/components/gradient-background';
import { Card, EmptyState, SectionLabel, PrimaryButton } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, HairlineBorder, Placeholder, Pastel, Font } from '@/constants/theme';
import { fetchTrajectory, type Trajectory } from '@/lib/trajectory/api';
import { categoryLabel } from '@/lib/dashboard/api';

// Individual historical report scores; no connected progress curve or delta.

const CHART_W = 320;
const CHART_H = 160;
const PAD = 28;

function ScoreChart({ scores }: { scores: Trajectory['scores'] }) {
  // Keep the original 0-100 scale for each report.
  const xStep = scores.length > 1 ? (CHART_W - PAD * 2) / (scores.length - 1) : 0;
  const toX = (i: number) => PAD + i * xStep;
  const toY = (score: number) => PAD + (1 - score / 100) * (CHART_H - PAD * 2);
  // Label the latest point without treating differences as learning evidence.
  const li = scores.length - 1;
  const last = li >= 0 ? scores[li] : null;
  const lx = last ? toX(li) : 0;
  const ly = last ? toY(last.score) : 0;
  const pillY = Math.max(2, ly - 34); // jangan keluar atas chart

  return (
    <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {[0, 50, 100].map((v) => (
        <Line
          key={v}
          x1={PAD}
          y1={toY(v)}
          x2={CHART_W - PAD}
          y2={toY(v)}
          stroke={v === 50 ? '#F2F3F5' : HairlineBorder}
          strokeWidth={1}
        />
      ))}
      {[0, 50, 100].map((v) => (
        <SvgText
          key={v}
          x={PAD - 6}
          y={toY(v) + 3.5}
          fill={Placeholder}
          fontSize={10}
          textAnchor="end">
          {v}
        </SvgText>
      ))}
      {scores.map((p, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(p.score)} r={4} fill={Ink} />
      ))}
      {/* Latest report value only. */}
      {last && (
        <>
          <Circle cx={lx} cy={ly} r={9} fill={Pastel.lilac} opacity={0.55} />
          <Circle cx={lx} cy={ly} r={4.5} fill={Ink} />
          <Rect x={lx - 17} y={pillY} width={34} height={20} rx={6} fill={Ink} />
          <SvgText x={lx} y={pillY + 14} fill="#FFFFFF" fontSize={12} fontWeight="700" textAnchor="middle">
            {last.score}
          </SvgText>
        </>
      )}
    </Svg>
  );
}

export default function TrajectoryScreen() {
  const [data, setData] = useState<Trajectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTrajectory()
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
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn&apos;t load your trajectory. Try again later.</Text>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>Your practice history</Text>

          {/* Insight — jawaban satu kalimat (kartu cream, warna fitur Trajectory) */}
          <View style={styles.insightCard}>
            <View style={styles.insightIconTile}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M12 3l2.2 6.5L20 12l-5.8 2.5L12 21l-2.2-6.5L4 12l5.8-2.5z"
                  fill="none"
                  stroke={Pastel.creamInk}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.insightBody}>
              <Text style={styles.insightLabel}>Practice record</Text>
              <Text style={styles.insightText}>{data.insight}</Text>
            </View>
          </View>

          {/* Grafik skor */}
          <SectionLabel style={styles.sectionLabel}>Practice scores over time</SectionLabel>
          {data.scores.length > 0 ? (
            <Card style={styles.chartCard}>
              <Text style={styles.emptyText}>Each point is one report. Questions and scoring instructions may differ; score differences do not establish learning.</Text>
              <ScoreChart scores={data.scores} />
              <View style={styles.chartFooter}>
                <Text style={styles.axisDate}>{data.scores[0].date}</Text>
                {data.scores.length > 1 && (
                  <Text style={[styles.axisDate, styles.axisDateLast]}>
                    {data.scores[data.scores.length - 1].date}
                  </Text>
                )}
              </View>
              {data.scores.map((score, index) => <Text key={index} style={styles.emptyText}>{score.date} · {score.role ?? 'Archived report'} · {score.score}/100</Text>)}
            </Card>
          ) : (
            // EMPTY state persis component sheet mockup (judul + sub + CTA).
            <EmptyState
              title="No mock interviews yet"
              subtitle="Your trajectory appears here after the first one."
              ctaLabel="Start a mock"
              onCta={() => router.push('/interview')}
            />
          )}
          <PrimaryButton label="View guided practice history" onPress={() => router.push('/conversations')} />

          {/* Tren kesalahan 14 hari vs 14 hari sebelumnya */}
          <View style={styles.trendsHeader}>
            <SectionLabel>Recorded corrections</SectionLabel>
            <Text style={styles.trendsCaption}>Last 14 days / prior 14</Text>
          </View>
          {data.trends.length > 0 ? (
            <View style={styles.trendList}>
              <Text style={styles.emptyText}>Counts depend on how much you practice. Fewer records do not prove improvement.</Text>
              {data.trends.map(t => (
                <View key={t.category} style={styles.trendRow}>
                  <Text style={styles.trendLabel} numberOfLines={1}>{categoryLabel(t.category)}</Text>
                  <Text style={styles.trendChangeText}>{t.recentCount} / {t.previousCount}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Card>
              <Text style={styles.emptyText}>
                Practice conversations to start tracking mistake trends.
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  errorText: { fontSize: 15, lineHeight: 21, color: '#60646C', fontFamily: Font.medium, textAlign: 'center' },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.three },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: Ink, fontSize: 15, fontFamily: Font.semibold },
  title: { fontSize: 30, lineHeight: 37, fontFamily: Font.extrabold, color: Ink, marginTop: Spacing.one },

  // Insight card (cream) — "The trend"
  insightCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Pastel.cream,
  },
  insightIconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: { flex: 1 },
  insightLabel: {
    fontSize: 11,
    fontFamily: Font.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7A6B3A',
  },
  insightText: { fontSize: 15, lineHeight: 21, fontFamily: Font.bold, color: Pastel.creamInk, marginTop: 5 },

  sectionLabel: { marginTop: Spacing.two, paddingLeft: 2 },

  chartCard: { gap: 10 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  axisDate: { fontSize: 11, fontFamily: Font.medium, color: Placeholder, fontVariant: ['tabular-nums'] },
  axisDateLast: { color: Ink, fontFamily: Font.bold },

  emptyText: { fontSize: 14, lineHeight: 20, color: '#60646C', fontFamily: Font.medium },

  trendsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: Spacing.two,
    paddingLeft: 2,
  },
  trendsCaption: { fontSize: 12, fontFamily: Font.medium, color: '#8B8F98' },

  trendList: { gap: Spacing.two },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  trendLabel: { flex: 1, fontSize: 14.5, fontFamily: Font.semibold, color: Ink },
  trendChange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendChangeText: { fontSize: 13, fontFamily: Font.bold, fontVariant: ['tabular-nums'] },
});
