import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

import { GradientBackground } from '@/components/gradient-background';
import { Card, SectionLabel } from '@/components/ui';
import {
  Spacing,
  MaxContentWidth,
  Ink,
  HairlineBorder,
  Placeholder,
  Success,
  Danger,
} from '@/constants/theme';
import { fetchTrajectory, type Trajectory } from '@/lib/trajectory/api';
import { categoryLabel } from '@/lib/dashboard/api';

// Grafik garis skor readiness lintas-waktu. SVG polos (react-native-svg sudah
// ada) -- tanpa lib chart baru untuk satu line chart.

const CHART_W = 320;
const CHART_H = 160;
const PAD = 28;

function ScoreChart({ scores }: { scores: Trajectory['scores'] }) {
  // Skala Y tetap 0-100 (skor readiness memang 0-100) -- perbandingan antar
  // waktu jujur, tidak di-zoom biar kelihatan dramatis.
  const xStep = scores.length > 1 ? (CHART_W - PAD * 2) / (scores.length - 1) : 0;
  const toX = (i: number) => PAD + i * xStep;
  const toY = (score: number) => PAD + (1 - score / 100) * (CHART_H - PAD * 2);
  const points = scores.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');

  return (
    <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {[0, 50, 100].map((v) => (
        <Line
          key={v}
          x1={PAD}
          y1={toY(v)}
          x2={CHART_W - PAD}
          y2={toY(v)}
          stroke={HairlineBorder}
          strokeWidth={1}
          strokeDasharray={v === 50 ? '4 4' : undefined}
        />
      ))}
      {[0, 50, 100].map((v) => (
        <SvgText key={v} x={4} y={toY(v) + 4} fill={Placeholder} fontSize={10}>
          {v}
        </SvgText>
      ))}
      {scores.length > 1 && (
        <Polyline points={points} fill="none" stroke={Ink} strokeWidth={2.5} />
      )}
      {scores.map((p, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(p.score)} r={4} fill={Ink} />
      ))}
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

          <Text style={styles.title}>Am I getting better?</Text>

          {/* Insight — jawaban satu kalimat */}
          <Card style={styles.insightCard}>
            <SectionLabel>The trend</SectionLabel>
            <Text style={styles.insightText}>{data.insight}</Text>
          </Card>

          {/* Grafik skor */}
          <SectionLabel style={styles.sectionLabel}>Readiness over time</SectionLabel>
          {data.scores.length > 0 ? (
            <Card style={styles.chartCard}>
              <ScoreChart scores={data.scores} />
              <View style={styles.chartFooter}>
                <Text style={styles.axisDate}>{data.scores[0].date}</Text>
                {data.scores.length > 1 && (
                  <Text style={styles.axisDate}>{data.scores[data.scores.length - 1].date}</Text>
                )}
              </View>
            </Card>
          ) : (
            <Card>
              <Text style={styles.emptyText}>
                No mock interviews yet. Your score history will chart here after your first one.
              </Text>
            </Card>
          )}

          {/* Tren kesalahan 14 hari vs 14 hari sebelumnya */}
          <SectionLabel style={styles.sectionLabel}>Mistake trends</SectionLabel>
          <Text style={styles.subtitle}>2 weeks vs before</Text>
          {data.trends.length > 0 ? (
            <View style={styles.trendList}>
              {data.trends.map((t) => {
                const improving = t.changePct !== null && t.changePct < 0;
                const worsening = t.changePct !== null && t.changePct > 0;
                return (
                  <View key={t.category} style={styles.trendRow}>
                    <Text style={styles.trendLabel} numberOfLines={1}>
                      {categoryLabel(t.category)}
                    </Text>
                    <Text
                      style={[
                        styles.trendChange,
                        { color: improving ? Success : worsening ? Danger : '#60646C' },
                      ]}>
                      {t.changePct === null
                        ? `new · ${t.recentCount} times`
                        : `${improving ? 'down' : worsening ? 'up' : 'steady'} ${Math.abs(t.changePct)}% (${t.previousCount} to ${t.recentCount})`}
                    </Text>
                  </View>
                );
              })}
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
  errorText: { fontSize: 15, lineHeight: 21, color: '#60646C', fontWeight: '500', textAlign: 'center' },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.three },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: Ink, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: Ink, marginTop: Spacing.one },
  insightCard: { gap: Spacing.two },
  insightText: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: Ink },
  sectionLabel: { marginTop: Spacing.two },
  chartCard: { gap: Spacing.three },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  axisDate: { fontSize: 12, fontWeight: '500', color: Placeholder, fontVariant: ['tabular-nums'] },
  emptyText: { fontSize: 14, lineHeight: 20, color: '#60646C', fontWeight: '500' },
  subtitle: { fontSize: 14, color: '#60646C', fontWeight: '500', marginTop: -Spacing.two },
  trendList: { gap: Spacing.two },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HairlineBorder,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 60,
  },
  trendLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Ink },
  trendChange: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
