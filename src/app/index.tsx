import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { TalklyMark } from '@/components/talkly-mark';
import { Chip, ListRow, SectionLabel, BottomNav, HeroCard } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Pastel } from '@/constants/theme';
import { fetchCurrentUser } from '@/lib/auth/api';
import { fetchDashboard, type DashboardData } from '@/lib/dashboard/api';
import { fetchSuggestedScenario, type SuggestedScenario } from '@/lib/conversations/api';
import { fetchInterviewPlan, type InterviewPlanResponse } from '@/lib/interview-plan/api';
import { notificationsSupported, configureNotificationHandler } from '@/lib/notifications';

// Tone lilac-dalam khusus kartu countdown (dari mockup) — lebih pekat dari
// Pastel.lilacInk supaya angka besar kontras di atas lilac.
const LILAC_DEEP = '#2A1D45';
const LILAC_MUTED = '#6E5C93';
const LILAC_TODAY = '#8877A8';
const LILAC_ICON = '#3E2C63';
const HERO_BG = '#101014';

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [dashFailed, setDashFailed] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestedScenario | null>(null);
  const [plan, setPlan] = useState<InterviewPlanResponse | null>(null);

  function openPlanTask() {
    if (!plan || !plan.set || plan.expired) return;
    const task = plan.todayTask;
    if (task.type === 'mock') {
      router.push('/interview');
    } else if (task.type === 'practice') {
      router.push({
        pathname: '/conversation',
        params: { scenario: task.scenario ?? '', focus: task.focusCategories?.join(',') ?? '' },
      });
    } else {
      router.push('/dashboard');
    }
  }

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!user.nativeLanguage) {
        router.replace('/onboarding');
        return;
      }
      setEmail(user.email);
      setUserName(user.name ?? null);
      setChecking(false);
    });
    if (notificationsSupported) {
      configureNotificationHandler();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard()
        .then((d) => {
          setDash(d);
          setDashFailed(false);
        })
        .catch(() => setDashFailed(true));
      fetchSuggestedScenario()
        .then(setSuggestion)
        .catch(() => {});
      fetchInterviewPlan()
        .then(setPlan)
        .catch(() => {});
    }, []),
  );

  if (checking) {
    return (
      <View style={[styles.root, styles.centered]}>
        <TalklyMark size={64} />
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  // Sapaan pakai nama panggilan bila ada; fallback potongan email (jujur,
  // tanpa data palsu) untuk akun lama yang belum mengisi nama.
  const name = userName ?? (email ? email.split('@')[0] : 'there');
  const initial = (userName?.[0] ?? email?.[0] ?? 'T').toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HERO band gelap */}
          <View style={styles.hero}>
            <View style={styles.heroGlowA} />
            <View style={styles.heroGlowB} />
            {/* floating motif */}
            <View style={styles.bubbleYouGotThis}>
              <Text style={styles.bubbleYouGotThisText}>You got this</Text>
            </View>
            <View style={[styles.dot, { top: 18, right: 150, backgroundColor: Pastel.pink }]} />
            <View style={[styles.dot, { top: 70, right: 44, width: 9, height: 9, backgroundColor: Pastel.mint }]} />

            <View style={styles.header}>
              <View style={styles.lockup}>
                <TalklyMark size={22} variant="white" />
                <Text style={styles.wordmark}>Talkly</Text>
              </View>
              <Pressable
                onPress={() => router.push('/settings')}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </Pressable>
            </View>

            <View style={styles.greeting}>
              <Text style={styles.greetingTitle}>Hi {name},{'\n'}ready to practice?</Text>
              <Text style={styles.greetingCaption}>
                A few quiet minutes now, steadier nerves later.
              </Text>
            </View>
          </View>

          {/* WHITE sheet */}
          <View style={styles.sheet}>
            {/* Countdown */}
            {plan && plan.set && !plan.expired && (
              <Pressable
                onPress={openPlanTask}
                accessibilityRole="button"
                accessibilityLabel={`Countdown: ${plan.daysLeft} ${plan.daysLeft === 1 ? 'day' : 'days'} until your ${plan.role} interview. Today's task: ${plan.todayTask.title}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                <HeroCard pastel="lilac" style={styles.countdown}>
                  <View style={styles.cdTopRow}>
                    <Text style={styles.cdLabel}>Countdown</Text>
                    <View style={styles.cdIconTile}>
                      <Feather name="calendar" size={17} color={LILAC_ICON} />
                    </View>
                  </View>
                  <View style={styles.cdNumRow}>
                    <Text style={styles.cdNum}>{plan.daysLeft}</Text>
                    <Text style={styles.cdUnit}>
                      {plan.daysLeft === 1 ? 'day until your' : 'days until your'}
                    </Text>
                  </View>
                  <Text style={styles.cdRole}>{plan.role} interview</Text>
                  <View style={styles.cdDivider} />
                  <View style={styles.cdTodayRow}>
                    <View style={styles.cdCheck}>
                      <Feather name="check" size={12} color={LILAC_ICON} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.cdTodayLabel}>Today</Text>
                      <Text style={styles.cdTask} numberOfLines={2}>
                        {plan.todayTask.title}
                      </Text>
                    </View>
                  </View>
                </HeroCard>
              </Pressable>
            )}
            {plan && plan.set && plan.expired && (
              <Pressable
                onPress={() => router.push('/interview-date')}
                accessibilityRole="button"
                accessibilityLabel="Your interview date has passed. Set your next interview date."
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                <View style={styles.planPrompt}>
                  <Text style={styles.planPromptTitle}>Your interview date has passed</Text>
                  <Text style={styles.planPromptSub}>
                    How did it go? Set your next interview date to keep prepping.
                  </Text>
                </View>
              </Pressable>
            )}
            {plan && !plan.set && (
              <Pressable
                onPress={() => router.push('/interview-date')}
                accessibilityRole="button"
                accessibilityLabel="Have an interview coming up? Set the date to shape your daily practice."
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                <View style={styles.planPrompt}>
                  <Text style={styles.planPromptTitle}>Have an interview coming up?</Text>
                  <Text style={styles.planPromptSub}>
                    Set the date and I will shape each day&apos;s practice around it.
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Chips */}
            <View style={styles.chipsWrap}>
              <Chip label="Free chat" selected onPress={() => router.push('/conversation')} />
              <Chip label="Mock interview" onPress={() => router.push('/interview')} />
              {suggestion && (
                <Chip
                  label="Targeted"
                  onPress={() =>
                    router.push({
                      pathname: '/conversation',
                      params: {
                        scenario: suggestion.scenario,
                        focus: suggestion.focusCategories.join(','),
                      },
                    })
                  }
                />
              )}
            </View>

            {/* Workspace */}
            <View style={styles.workspace}>
              <SectionLabel style={styles.wsLabel}>Workspace</SectionLabel>
              <ListRow
                pastel="ice"
                icon="message-circle"
                title="Conversations"
                value={dash ? `${dash.activity.totalSessions}` : dashFailed ? '—' : '...'}
                onPress={() => router.push('/conversations')}
              />
              <ListRow
                pastel="lilac"
                icon="target"
                title="Interview readiness"
                value={dash?.latestReadiness ? `${dash.latestReadiness.score} / 100` : 'not tested'}
                onPress={() =>
                  dash?.latestReadiness
                    ? router.push({
                        pathname: '/interview-report',
                        params: { sessionId: dash.latestReadiness.sessionId },
                      })
                    : router.push('/interview')
                }
              />
              <ListRow
                pastel="cream"
                icon="trending-up"
                title="Am I getting better?"
                value="trends"
                onPress={() => router.push('/trajectory')}
              />
              <ListRow
                pastel="pink"
                icon="zap"
                title="Streak"
                value={dash ? `${dash.streak.currentStreak} days` : dashFailed ? '—' : '...'}
                onPress={() => router.push('/dashboard')}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.navSafe}>
        <BottomNav
          active="home"
          onProgress={() => router.push('/dashboard')}
          onSettings={() => router.push('/settings')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HERO_BG },
  flex: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  scrollContent: { flexGrow: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  hero: {
    backgroundColor: HERO_BG,
    paddingBottom: 46,
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(230,220,248,0.12)',
  },
  heroGlowB: {
    position: 'absolute',
    top: 96,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(216,239,246,0.08)',
  },
  bubbleYouGotThis: {
    position: 'absolute',
    top: 86,
    right: 22,
    zIndex: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Pastel.lilac,
    transform: [{ rotate: '-5deg' }],
  },
  bubbleYouGotThisText: { fontSize: 13, fontWeight: '700', color: Pastel.lilacInk },
  dot: { position: 'absolute', zIndex: 3, width: 12, height: 12, borderRadius: 999 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    zIndex: 2,
  },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5, color: '#FFFFFF' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  greeting: { paddingHorizontal: Spacing.four, paddingTop: 6, zIndex: 2 },
  greetingTitle: { fontSize: 25, lineHeight: 29, fontWeight: '800', letterSpacing: -0.6, color: '#FFFFFF' },
  greetingCaption: { fontSize: 15, color: 'rgba(255,255,255,0.68)', marginTop: 8 },
  sheet: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -26,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Spacing.five,
    gap: 10,
  },
  countdown: { borderRadius: 24, paddingVertical: 13, paddingHorizontal: 18 },
  cdTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cdLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: LILAC_MUTED },
  cdIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cdNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 5 },
  cdNum: { fontSize: 34, lineHeight: 34, fontWeight: '800', letterSpacing: -1, color: LILAC_DEEP, fontVariant: ['tabular-nums'] },
  cdUnit: { fontSize: 15, fontWeight: '500', color: LILAC_MUTED },
  cdRole: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, color: LILAC_DEEP, marginTop: 2 },
  cdDivider: { height: 1, backgroundColor: 'rgba(62,44,99,0.14)', marginVertical: 8 },
  cdTodayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cdCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cdTodayLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: LILAC_TODAY },
  cdTask: { fontSize: 14, fontWeight: '600', color: LILAC_DEEP, lineHeight: 19 },
  planPrompt: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEDEF',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 4,
  },
  planPromptTitle: { fontSize: 16, fontWeight: '700', color: Ink },
  planPromptSub: { fontSize: 14, lineHeight: 20, color: '#60646C', fontWeight: '500' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  workspace: { gap: 6, marginTop: 1 },
  wsLabel: { paddingLeft: 2, marginBottom: 2 },
  navSafe: { backgroundColor: '#FFFFFF' },
});
