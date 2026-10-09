import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { PrimaryButton, SectionLabel } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Pastel, HairlineBorder, HeroBg } from '@/constants/theme';
import { generateReport, type InterviewReportResponse } from '@/lib/interviews/api';
import { fetchSuggestedScenario } from '@/lib/conversations/api';
import { ApiError, NetworkError } from '@/lib/api/client';

// Kata + kalimat vonis diturunkan dari skor (presentasi murni; data tak punya
// field verdict). Warm, tenang, tanpa emoji/em-dash.
function verdictFor(score: number): { word: string; sentence: string; bubble: string } {
  if (score >= 85) {
    return {
      word: 'Strong practice answers',
      sentence: 'These practice answers are clear. Review the specific feedback below.',
      bubble: 'Keep practising',
    };
  }
  if (score >= 70) {
    return {
      word: 'Promising practice answers',
      sentence: 'Use the feedback below to make your next answers clearer.',
      bubble: 'Keep practising',
    };
  }
  if (score >= 50) {
    return {
      word: 'Getting there',
      sentence: 'Solid base. Work the fixes below to lift your score.',
      bubble: 'Keep going!',
    };
  }
  return {
    word: 'Early days',
    sentence: 'Good start. Try the fixes and run a few more rounds.',
    bubble: 'You got this',
  };
}

// Rapor contoh untuk PREVIEW DESAIN dev-only (?preview=1, hanya saat __DEV__).
// Mengikuti frame mockup "04 Readiness Report" dengan SCHEMA NYATA app (4
// dimensi grammar/structure/content/confidence) supaya layout bisa dibanding
// 1:1 TANPA memanggil AI. Tidak pernah tampil untuk user sungguhan.
const PREVIEW_REPORT: InterviewReportResponse = {
  score: 72,
  previousScore: 64,
  createdAt: '2026-07-04T09:12:00.000Z',
  report: {
    rubricVersion: 'practice-v1',
    interviewRole: 'Software Engineer',
    score: 72,
    dimensions: {
      grammar: { score: 70, comment: 'Cuida los tiempos verbales.' },
      structure: { score: 64, comment: 'Añade inicio y cierre claros.' },
      content: { score: 78, comment: 'Claro y fácil de seguir.' },
      confidence: { score: 65, comment: 'Explica tu acción y el resultado sin añadir hechos nuevos.' },
    },
    strongestAnswer: { question: '“Why this role?”', why: 'Specific and genuine.' },
    weakestAnswer: { question: '“A conflict?”', why: 'Land the result.' },
    topFixes: [
      'Open with a one-line summary before details.',
      'Swap “ehm” for a short, calm pause.',
      'End each answer with the result or outcome.',
    ],
    answerUpgrades: [
      {
        question: 'Tell me about a difficult project.',
        original: '“I worked on a project, it was difficult, but in the end we finished it.”',
        upgraded:
          'I worked on a difficult project. Despite the challenges, our team finished it.',
      },
    ],
  },
};

// Rapor kesiapan interview (fitur #6). POST idempoten: rapor yang sudah ada
// dikembalikan server tanpa panggilan AI kedua.
export default function InterviewReportScreen() {
  const { sessionId, preview } = useLocalSearchParams<{ sessionId?: string; preview?: string }>();
  // Preview DESAIN dev-only: render frame mockup tanpa sessionId & tanpa AI.
  const isPreview = __DEV__ && preview === '1';
  const [data, setData] = useState<InterviewReportResponse | null>(
    isPreview ? PREVIEW_REPORT : null,
  );
  // Tanpa sessionId = kondisi TURUNAN (bukan state) -- hindari setState
  // langsung di body effect (rule react-hooks/set-state-in-effect).
  const missingSession = !sessionId && !isPreview;
  const [loading, setLoading] = useState(!missingSession && !isPreview);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [startingPractice, setStartingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
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
          <Text style={styles.centerText}>Preparing your practice report…</Text>
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
  const isCurrentRubric = report.rubricVersion === 'practice-v1';
  async function startFocusedPractice() {
    if (startingPractice) return;
    if (data?.practiceContext) {
      router.push({ pathname: '/conversation', params: {
        practiceSource: data.practiceContext.sourceSessionId,
        practiceTarget: data.practiceContext.targetId,
      } });
      return;
    }
    setStartingPractice(true);
    setPracticeError(null);
    try {
      const suggestion = await fetchSuggestedScenario();
      router.push({ pathname: '/conversation', params: {
        scenario: suggestion?.scenario ?? 'About yourself', focus: suggestion?.focusCategories.join(',') ?? '',
        retryRole: report.interviewRole ?? '',
      } });
    } catch {
      setPracticeError('Could not load a focused practice. Your report is still available. Try again.');
    } finally {
      setStartingPractice(false);
    }
  }
  // Label satu-kata (gaya mockup) untuk grid dimensi dua kolom.
  const dims = [
    { label: 'Grammar', d: report.dimensions.grammar },
    { label: 'Structure', d: report.dimensions.structure },
    { label: 'Content', d: report.dimensions.content },
    ...(report.dimensions.confidence ? [{ label: isCurrentRubric ? 'Answer wording' : 'Legacy confidence score', d: report.dimensions.confidence }] : []),
  ];
  const verdict = verdictFor(data.score);
  const scorePct = Math.max(0, Math.min(100, data.score));

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HERO band gelap: skor readiness besar di atas near-black */}
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            {/* Pil motif mengambang (mockup): kata semangat TURUNAN skor. */}
            <View style={styles.heroBubble}>
              <Text style={styles.heroBubbleText}>{verdict.bubble}</Text>
            </View>

            <View style={styles.nav}>
              <Pressable
                onPress={() => router.replace('/')}
                accessibilityRole="button"
                accessibilityLabel="Back to home"
                hitSlop={8}
                style={styles.navBtn}>
                <Feather name="chevron-left" size={18} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.navTitle}>Practice report</Text>
              <View style={styles.navSpacer} />
            </View>

            <View style={styles.scoreBlock}>
              <Text style={styles.scoreLabel}>Practice score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{data.score}</Text>
                <Text style={styles.scoreOutOf}>/ 100</Text>
              </View>
              <View style={styles.verdictRow}>
                <Text style={styles.verdictWord}>{verdict.word}</Text>
              </View>
              <View style={styles.heroTrack}>
                <View style={[styles.heroFill, { width: `${scorePct}%` }]} />
              </View>
              <Text style={styles.heroDesc}>{verdict.sentence}</Text>
            </View>
          </View>

          {/* SHEET putih membulat menaungi hero */}
          <View style={styles.sheet}>
            {/* By dimension: grid tinted tile (skor + bar) + komentar */}
            <View style={styles.section}>
              <SectionLabel style={styles.sectionLabel}>By dimension</SectionLabel>
              <View style={styles.dimGrid}>
                {dims.map(({ label, d }) => (
                  <View key={label} style={styles.dimTile}>
                    <View style={styles.dimHead}>
                      <Text style={styles.dimLabel}>{label}</Text>
                      <Text style={styles.dimScore}>{d.score}</Text>
                    </View>
                    <View style={styles.dimTrack}>
                      <View style={[styles.dimFill, { width: `${Math.max(0, Math.min(100, d.score))}%` }]} />
                    </View>
                    <Text style={styles.dimComment}>{d.comment}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Batasi arti penilaian pada jawaban latihan yang benar-benar diamati. */}
            <View style={styles.dimClarify}>
              <Feather name="zap" size={14} color="#92400E" style={styles.dimClarifyIcon} />
              <Text style={styles.dimClarifyText}>
                Feedback is based on the text of these practice answers. It does not measure
                pronunciation, personal confidence, or predict a hiring decision.
                {!isCurrentRubric && " This archived report used older scoring instructions. Its scores are not compared with the current rubric."}
              </Text>
            </View>

            {/* Strongest (mint) / Needs work (pink) */}
            <View style={styles.highlightRow}>
              <View style={[styles.highlightTile, styles.strongTile]}>
                <View style={styles.highlightHead}>
                  <Feather name="check" size={14} color="#1F4433" />
                  <Text style={[styles.highlightKicker, { color: '#1F4433' }]}>Strongest</Text>
                </View>
                <Text style={[styles.highlightQ, { color: '#173A2A' }]}>
                  {report.strongestAnswer.question}
                </Text>
                <Text style={[styles.highlightWhy, { color: '#3E6B54' }]}>
                  {report.strongestAnswer.why}
                </Text>
              </View>
              <View style={[styles.highlightTile, styles.needsTile]}>
                <View style={styles.highlightHead}>
                  <Feather name="alert-triangle" size={14} color="#3D2A31" />
                  <Text style={[styles.highlightKicker, { color: '#3D2A31' }]}>{report.topFixes.length > 0 ? 'Needs work' : 'Answer to review'}</Text>
                </View>
                <Text style={[styles.highlightQ, { color: '#3D2A31' }]}>
                  {report.weakestAnswer.question}
                </Text>
                <Text style={[styles.highlightWhy, { color: '#7A5560' }]}>
                  {report.weakestAnswer.why}
                </Text>
              </View>
            </View>

            {/* Top fixes: daftar bernomor */}
            {report.topFixes.length > 0 && <View style={styles.section}>
              <SectionLabel style={styles.sectionLabel}>Top fixes</SectionLabel>
              {report.topFixes.map((fix, i) => (
                <View key={i} style={styles.fixRow}>
                  <View style={styles.fixNum}>
                    <Text style={styles.fixNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.fixText}>{fix}</Text>
                </View>
              ))}
            </View>}

            {/* Answer upgrade: kartu abu, jawaban asli -> versi lebih kuat */}
            {report.answerUpgrades.length > 0 && <View style={styles.section}>
              <SectionLabel style={styles.sectionLabel}>Answer upgrade</SectionLabel>
              {report.answerUpgrades.map((u, i) => (
                <View key={i} style={styles.upgradeCard}>
                  <Text style={styles.upgradeQuestion}>{u.question}</Text>
                  <Text style={styles.upgradeYourLabel}>Your answer</Text>
                  <Text style={styles.upgradeOriginal}>{u.original}</Text>
                  <View style={styles.upgradeDivider}>
                    <Feather name="star" size={14} color={Ink} />
                    <Text style={styles.upgradeStrongerLabel}>Stronger</Text>
                  </View>
                  <Text style={styles.upgradeStronger}>{u.upgraded}</Text>
                </View>
              ))}
            </View>}

            {/* Aksi */}
            <View style={styles.cta}>
              {data.practiceContext ? (
                <Text style={styles.fixText}>One improvement: {data.practiceContext.selectedFix}</Text>
              ) : (
                <Text style={styles.dimComment}>No linked practice target. General practice is not tied to an answer in this report.</Text>
              )}
              <PrimaryButton label={data.practiceContext ? 'Revise this answer' : 'General language practice'} onPress={startFocusedPractice} loading={startingPractice} />
              {practiceError && <Text style={styles.errorText}>{practiceError}</Text>}
              <Pressable accessibilityRole="button" style={styles.backHome}
                onPress={() => report.interviewRole
                  ? router.push({ pathname: '/conversation', params: { mode: 'interview', role: report.interviewRole } })
                  : router.push('/interview')}>
                <Text style={styles.backHomeText}>Try another mock interview</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/')}
                accessibilityRole="button"
                style={styles.backHome}>
                <Text style={styles.backHomeText}>Back to home</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Loading / error (dipertahankan)
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centerText: { color: '#60646C', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  errorText: { color: '#60646C', fontSize: 15, fontWeight: '500', textAlign: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.two },
  backText: { color: Ink, fontSize: 15, fontWeight: '600' },

  // Shell (dark root + sheet putih, senada Home)
  root: { flex: 1, backgroundColor: HeroBg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },

  // Hero band gelap
  hero: { backgroundColor: HeroBg, paddingBottom: 42, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(205,238,219,0.12)',
  },
  heroBubble: {
    position: 'absolute',
    top: 92,
    right: 22,
    zIndex: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Pastel.mint,
    transform: [{ rotate: '5deg' }],
  },
  heroBubbleText: { fontSize: 13, fontWeight: '700', color: Pastel.mintInk },
  nav: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  navSpacer: { width: 38, height: 38 },
  navTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  scoreBlock: { paddingHorizontal: 24, paddingTop: 12, zIndex: 2 },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  scoreValue: {
    fontSize: 52,
    lineHeight: 52,
    fontWeight: '800',
    letterSpacing: -2,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  scoreOutOf: { fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  verdictWord: { fontSize: 19, fontWeight: '700', color: '#FFFFFF' },
  verdictDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#CDEEDB' },
  verdictDelta: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  heroTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroFill: { height: '100%', borderRadius: 999, backgroundColor: '#FFFFFF' },
  heroDesc: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.68)', marginTop: 14 },

  // Sheet putih
  sheet: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -26,
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 11,
  },
  section: { gap: 11 },
  sectionLabel: { paddingLeft: 2 },

  // Dimensi
  dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dimTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F7F8F9',
    borderWidth: 1,
    borderColor: HairlineBorder,
  },
  dimHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dimLabel: { flexShrink: 1, marginRight: 6, fontSize: 13.5, fontWeight: '700', color: '#111114' },
  dimScore: { fontSize: 15, fontWeight: '800', color: '#111114', fontVariant: ['tabular-nums'] },
  dimTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E7E8EB',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 7,
  },
  dimFill: { height: '100%', borderRadius: 999, backgroundColor: '#111114' },
  dimComment: { fontSize: 11.5, lineHeight: 15, color: '#60646C', marginTop: 0 },
  dimConfidenceFill: { height: '100%', borderRadius: 999, backgroundColor: Pastel.lilacInk },
  dimClarify: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDE9C8',
    marginTop: 2,
  },
  dimClarifyIcon: { marginTop: 1 },
  dimClarifyText: { fontSize: 10.5, lineHeight: 14, color: '#92400E' },

  // Highlights
  highlightRow: { flexDirection: 'row', gap: 10 },
  highlightTile: { flex: 1, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 20 },
  strongTile: { backgroundColor: Pastel.mint },
  needsTile: { backgroundColor: Pastel.pink },
  highlightHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  highlightKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  highlightQ: { fontSize: 14, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  highlightWhy: { fontSize: 12.5, lineHeight: 18 },

  // Top fixes
  fixRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  fixNum: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixNumText: { fontSize: 12, fontWeight: '700', color: Ink, fontVariant: ['tabular-nums'] },
  fixText: { flex: 1, fontSize: 14, lineHeight: 20, color: Ink },

  // Answer upgrade
  upgradeCard: { padding: 15, borderRadius: 20, backgroundColor: '#F2F3F5' },
  upgradeQuestion: { fontSize: 14, fontWeight: '700', color: Ink, marginBottom: 12 },
  upgradeYourLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#8B8F98',
  },
  upgradeOriginal: { fontSize: 13.5, lineHeight: 20, color: '#60646C', marginTop: 6, marginBottom: 13 },
  upgradeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: '#E4E5E8',
    paddingTop: 13,
    marginBottom: 12,
  },
  upgradeStrongerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Ink,
  },
  upgradeStronger: { fontSize: 13.5, lineHeight: 20, color: Ink },

  // Aksi
  cta: { gap: 8, paddingTop: 2 },
  backHome: { alignItems: 'center', paddingVertical: 12 },
  backHomeText: { fontSize: 15, fontWeight: '600', color: Ink },
});
