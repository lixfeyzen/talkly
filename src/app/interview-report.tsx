import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, PrimaryButton, SectionLabel } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Pastel, HairlineBorder, Radius } from '@/constants/theme';
import { generateReport, type InterviewReportResponse } from '@/lib/interviews/api';
import { ApiError, NetworkError } from '@/lib/api/client';

// Kata + kalimat vonis diturunkan dari skor (presentasi murni; data tak punya
// field verdict). Warm, tenang, tanpa emoji/em-dash.
function verdictFor(score: number): { word: string; sentence: string } {
  if (score >= 85) {
    return { word: 'Interview ready', sentence: 'You are in strong shape. Keep your answers sharp.' };
  }
  if (score >= 70) {
    return { word: 'Nearly ready', sentence: 'You are close. A little polish and you will walk in calm.' };
  }
  if (score >= 50) {
    return { word: 'Getting there', sentence: 'Solid base. Work the fixes below to lift your score.' };
  }
  return { word: 'Early days', sentence: 'Good start. Try the fixes and run a few more rounds.' };
}

// Rapor kesiapan interview (fitur #6). POST idempoten: rapor yang sudah ada
// dikembalikan server tanpa panggilan AI kedua.
export default function InterviewReportScreen() {
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
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={Ink} />
          <Text style={styles.centerText}>Preparing your readiness report…</Text>
        </View>
      </GradientBackground>
    );
  }

  if (error || !data) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Something went wrong.'}</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
      </GradientBackground>
    );
  }

  const { report } = data;
  const dims = [
    { label: 'Grammar', d: report.dimensions.grammar },
    { label: 'Answer structure', d: report.dimensions.structure },
    { label: 'Content strength', d: report.dimensions.content },
  ];
  const verdict = verdictFor(data.score);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.replace('/')} style={styles.backLink} hitSlop={8}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Home</Text>
          </Pressable>

          <Text style={styles.title}>Readiness report</Text>

          {/* Hero skor keseluruhan di tile lilac (lilac = readiness) */}
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Overall readiness</Text>
            <View style={styles.heroScoreRow}>
              <Text style={styles.heroScore}>{data.score}</Text>
              <Text style={styles.heroOutOf}>/ 100</Text>
            </View>
            <Text style={styles.heroVerdict}>{verdict.word}</Text>
            <Text style={styles.heroSentence}>{verdict.sentence}</Text>
          </View>

          {/* Dimensi */}
          <SectionLabel style={styles.sectionSpacing}>By dimension</SectionLabel>
          <Card style={styles.dimCard}>
            {dims.map(({ label, d }, i) => (
              <View key={label} style={[styles.dimRow, i > 0 && styles.dimRowDivider]}>
                <View style={styles.dimHeader}>
                  <Text style={styles.dimLabel}>{label}</Text>
                  <Text style={styles.dimScore}>{d.score}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(100, Math.max(0, d.score))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.dimComment}>{d.comment}</Text>
              </View>
            ))}
          </Card>

          {/* Terkuat (mint) / terlemah (pink) */}
          <SectionLabel style={styles.sectionSpacing}>Highlights</SectionLabel>
          <Card style={styles.accentCard}>
            <View style={[styles.accentBar, { backgroundColor: Pastel.mint }]} />
            <View style={styles.accentBody}>
              <Text style={[styles.accentLabel, { color: Pastel.mintInk }]}>Strongest answer</Text>
              <Text style={styles.accentQuestion}>{report.strongestAnswer.question}</Text>
              <Text style={styles.accentWhy}>{report.strongestAnswer.why}</Text>
            </View>
          </Card>
          <Card style={styles.accentCard}>
            <View style={[styles.accentBar, { backgroundColor: Pastel.pink }]} />
            <View style={styles.accentBody}>
              <Text style={[styles.accentLabel, { color: Pastel.pinkInk }]}>Needs the most work</Text>
              <Text style={styles.accentQuestion}>{report.weakestAnswer.question}</Text>
              <Text style={styles.accentWhy}>{report.weakestAnswer.why}</Text>
            </View>
          </Card>

          {/* Fixes */}
          <SectionLabel style={styles.sectionSpacing}>Top fixes</SectionLabel>
          <Card style={styles.fixCard}>
            {report.topFixes.map((fix, i) => (
              <View key={i} style={[styles.fixRow, i > 0 && styles.fixRowDivider]}>
                <View style={styles.fixNum}>
                  <Text style={styles.fixNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.fixText}>{fix}</Text>
              </View>
            ))}
          </Card>

          {/* Answer upgrades */}
          <SectionLabel style={styles.sectionSpacing}>Answer upgrades</SectionLabel>
          <View style={styles.upgradeGroup}>
            {report.answerUpgrades.map((u, i) => (
              <Card key={i} style={styles.upgradeCard}>
                <Text style={styles.upgradeQuestion}>{u.question}</Text>
                <View style={styles.upgradeOriginal}>
                  <Text style={styles.upgradeTag}>You said</Text>
                  <Text style={styles.upgradeOriginalText}>{u.original}</Text>
                </View>
                <View style={styles.upgradeStronger}>
                  <Text style={[styles.upgradeTag, { color: Pastel.mintInk }]}>Stronger</Text>
                  <Text style={styles.upgradeStrongerText}>{u.upgraded}</Text>
                </View>
              </Card>
            ))}
          </View>

          <PrimaryButton
            label="Back to home"
            onPress={() => router.replace('/')}
            style={styles.homeButton}
          />
        </ScrollView>
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
  centerText: { color: '#60646C', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  errorText: { color: '#60646C', fontSize: 15, fontWeight: '500', textAlign: 'center' },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.two },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.two },
  backText: { color: Ink, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: Ink, marginBottom: Spacing.three },

  // Hero
  hero: {
    backgroundColor: Pastel.lilac,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  heroLabel: { color: Pastel.lilacInk, fontSize: 13, fontWeight: '700', opacity: 0.85 },
  heroScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  heroScore: {
    color: Pastel.lilacInk,
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroOutOf: { color: Pastel.lilacInk, fontSize: 20, fontWeight: '700', opacity: 0.7 },
  heroVerdict: { color: Pastel.lilacInk, fontSize: 18, fontWeight: '800', marginTop: Spacing.two },
  heroSentence: { color: Pastel.lilacInk, fontSize: 14, lineHeight: 20, fontWeight: '500', opacity: 0.9 },

  sectionSpacing: { marginTop: Spacing.four, marginBottom: Spacing.two },

  // Dimensi
  dimCard: { gap: 0, padding: Spacing.four },
  dimRow: { gap: Spacing.two },
  dimRowDivider: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: HairlineBorder,
  },
  dimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimLabel: { color: Ink, fontSize: 15, fontWeight: '600' },
  dimScore: { color: Ink, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F2F3F5' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: Ink },
  dimComment: { color: '#60646C', fontSize: 14, lineHeight: 20, fontWeight: '500' },

  // Highlights (accent)
  accentCard: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
  accentBar: { width: 5 },
  accentBody: { flex: 1, padding: Spacing.four, gap: Spacing.one },
  accentLabel: { fontSize: 13, fontWeight: '800' },
  accentQuestion: { color: Ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  accentWhy: { color: '#60646C', fontSize: 14, lineHeight: 20, fontWeight: '500' },

  // Top fixes
  fixCard: { padding: Spacing.four },
  fixRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  fixRowDivider: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: HairlineBorder,
  },
  fixNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Pastel.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixNumText: {
    color: Pastel.creamInk,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  fixText: { flex: 1, color: Ink, fontSize: 15, lineHeight: 21, fontWeight: '500' },

  // Answer upgrades
  upgradeGroup: { gap: Spacing.three },
  upgradeCard: { gap: Spacing.three },
  upgradeQuestion: { color: Ink, fontSize: 15, fontWeight: '700' },
  upgradeOriginal: {
    backgroundColor: '#F2F3F5',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  upgradeStronger: {
    backgroundColor: Pastel.mint,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  upgradeTag: {
    color: '#8B8F98',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  upgradeOriginalText: { color: '#60646C', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  upgradeStrongerText: { color: Pastel.mintInk, fontSize: 14, lineHeight: 21, fontWeight: '600' },

  homeButton: { marginTop: Spacing.five },
});
