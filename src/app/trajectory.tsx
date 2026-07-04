import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, CardShadow } from '@/constants/theme';
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
          stroke="#3A3650"
          strokeWidth={1}
          strokeDasharray={v === 50 ? '4 4' : undefined}
        />
      ))}
      {[0, 50, 100].map((v) => (
        <SvgText key={v} x={4} y={toY(v) + 4} fill="#8B87A0" fontSize={10}>
          {v}
        </SvgText>
      ))}
      {scores.length > 1 && (
        <Polyline points={points} fill="none" stroke={AccentColor} strokeWidth={2.5} />
      )}
      {scores.map((p, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(p.score)} r={4} fill={AccentColor} />
      ))}
    </Svg>
  );
}

export default function TrajectoryScreen() {
  const theme = useTheme();
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
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn’t load your trajectory. Try again later.
        </ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ThemedText type="link">← Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="link">← Back</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Am I getting better?
          </ThemedText>

          {/* Insight — jawaban satu kalimat */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" style={{ color: AccentColor }}>
              {data.insight}
            </ThemedText>
          </ThemedView>

          {/* Grafik skor */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Readiness scores
          </ThemedText>
          {data.scores.length > 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ScoreChart scores={data.scores} />
              <View style={styles.chartFooter}>
                <ThemedText type="small" themeColor="textSecondary">
                  {data.scores[0].date}
                </ThemedText>
                {data.scores.length > 1 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {data.scores[data.scores.length - 1].date}
                  </ThemedText>
                )}
              </View>
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                No mock interviews yet — your score history will chart here after
                your first one.
              </ThemedText>
            </ThemedView>
          )}

          {/* Tren kesalahan 14 hari vs 14 hari sebelumnya */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Mistake trends (last 2 weeks vs before)
          </ThemedText>
          {data.trends.length > 0 ? (
            data.trends.map((t) => {
              const improving = t.changePct !== null && t.changePct < 0;
              const worsening = t.changePct !== null && t.changePct > 0;
              return (
                <ThemedView key={t.category} type="backgroundElement" style={styles.trendRow}>
                  <ThemedText type="default" style={styles.trendLabel}>
                    {categoryLabel(t.category)}
                  </ThemedText>
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: improving ? '#2BAE7A' : worsening ? '#FF7A70' : theme.textSecondary,
                    }}>
                    {t.changePct === null
                      ? `new · ${t.recentCount}×`
                      : `${improving ? '▼' : worsening ? '▲' : '•'} ${Math.abs(t.changePct)}% (${t.previousCount}→${t.recentCount})`}
                  </ThemedText>
                </ThemedView>
              );
            })
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Practice conversations to start tracking mistake trends.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, gap: Spacing.three },
  backLink: { marginBottom: Spacing.one },
  title: { marginBottom: Spacing.two },
  card: { ...CardShadow, borderRadius: 20, padding: Spacing.three, gap: Spacing.one },
  sectionTitle: { marginTop: Spacing.two },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  trendRow: {
    ...CardShadow,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  trendLabel: { flex: 1 },
});
