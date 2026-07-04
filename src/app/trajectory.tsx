import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

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
  Pastel,
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
  // Titik terakhir + selisih vs skor pertama (data turunan, bukan math chart baru).
  const li = scores.length - 1;
  const last = li >= 0 ? scores[li] : null;
  const lx = last ? toX(li) : 0;
  const ly = last ? toY(last.score) : 0;
  const delta = scores.length >= 2 ? scores[li].score - scores[0].score : null;
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
      {scores.length > 1 && (
        <Polyline
          points={points}
          fill="none"
          stroke={Ink}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {scores.map((p, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(p.score)} r={4} fill={Ink} />
      ))}
      {/* Emphasis titik terakhir: halo lilac + value pill + badge delta */}
      {last && (
        <>
          <Circle cx={lx} cy={ly} r={9} fill={Pastel.lilac} opacity={0.55} />
          <Circle cx={lx} cy={ly} r={4.5} fill={Ink} />
          <Rect x={lx - 17} y={pillY} width={34} height={20} rx={6} fill={Ink} />
          <SvgText x={lx} y={pillY + 14} fill="#FFFFFF" fontSize={12} fontWeight="700" textAnchor="middle">
            {last.score}
          </SvgText>
          {delta !== null && (
            <SvgText
              x={lx - 22}
              y={ly + 4}
              fill={delta >= 0 ? Success : Danger}
              fontSize={11}
              fontWeight="700"
              textAnchor="end">
              {delta >= 0 ? `+${delta}` : `${delta}`}
            </SvgText>
          )}
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

          <Text style={styles.title}>Am I getting better?</Text>

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
              <Text style={styles.insightLabel}>The trend</Text>
              <Text style={styles.insightText}>{data.insight}</Text>
            </View>
          </View>

          {/* Grafik skor */}
          <SectionLabel style={styles.sectionLabel}>Readiness over time</SectionLabel>
          {data.scores.length > 0 ? (
            <Card style={styles.chartCard}>
              <ScoreChart scores={data.scores} />
              <View style={styles.chartFooter}>
                <Text style={styles.axisDate}>{data.scores[0].date}</Text>
                {data.scores.length > 1 && (
                  <Text style={[styles.axisDate, styles.axisDateLast]}>
                    {data.scores[data.scores.length - 1].date}
                  </Text>
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
          <View style={styles.trendsHeader}>
            <SectionLabel>Mistake trends</SectionLabel>
            <Text style={styles.trendsCaption}>2 weeks vs before</Text>
          </View>
          {data.trends.length > 0 ? (
            <View style={styles.trendList}>
              {data.trends.map((t) => {
                const pct = t.changePct;
                let icon: 'arrow-down' | 'arrow-up' | 'minus' | null = null;
                let color = '#60646C';
                let text: string;
                if (pct === null) {
                  // Kategori baru: belum ada pembanding 14 hari sebelumnya.
                  text = `New (${t.recentCount})`;
                } else if (pct < 0) {
                  icon = 'arrow-down';
                  color = Success;
                  text = `${Math.abs(pct)}% fewer`;
                } else if (pct > 0) {
                  icon = 'arrow-up';
                  color = Danger;
                  text = `${pct}% more`;
                } else {
                  icon = 'minus';
                  text = 'Steady';
                }
                return (
                  <View key={t.category} style={styles.trendRow}>
                    <Text style={styles.trendLabel} numberOfLines={1}>
                      {categoryLabel(t.category)}
                    </Text>
                    <View style={styles.trendChange}>
                      {icon && <Feather name={icon} size={14} color={color} />}
                      <Text style={[styles.trendChangeText, { color }]}>{text}</Text>
                    </View>
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
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7A6B3A',
  },
  insightText: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: Pastel.creamInk, marginTop: 5 },

  sectionLabel: { marginTop: Spacing.two, paddingLeft: 2 },

  chartCard: { gap: 10 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  axisDate: { fontSize: 11, fontWeight: '500', color: Placeholder, fontVariant: ['tabular-nums'] },
  axisDateLast: { color: Ink, fontWeight: '700' },

  emptyText: { fontSize: 14, lineHeight: 20, color: '#60646C', fontWeight: '500' },

  trendsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: Spacing.two,
    paddingLeft: 2,
  },
  trendsCaption: { fontSize: 12, fontWeight: '500', color: '#8B8F98' },

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
  trendLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: Ink },
  trendChange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendChangeText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
