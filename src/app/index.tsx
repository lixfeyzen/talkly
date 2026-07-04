import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { GradientBackground } from '@/components/gradient-background';
import { TalklyMark } from '@/components/talkly-mark';
import { Card, Chip, ListRow, SectionLabel, BottomNav } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Pastel, Radius, HairlineBorder } from '@/constants/theme';
import { fetchCurrentUser } from '@/lib/auth/api';
import { fetchDashboard, type DashboardData } from '@/lib/dashboard/api';
import { fetchSuggestedScenario, type SuggestedScenario } from '@/lib/conversations/api';
import { fetchInterviewPlan, type InterviewPlanResponse } from '@/lib/interview-plan/api';
import { notificationsSupported, configureNotificationHandler } from '@/lib/notifications';

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestedScenario | null>(null);
  const [plan, setPlan] = useState<InterviewPlanResponse | null>(null);

  // Tap tugas hari ini -> layar yang tepat utk jenis tugasnya.
  function openPlanTask() {
    if (!plan || !plan.set || plan.expired) return;
    const task = plan.todayTask;
    if (task.type === 'mock') {
      router.push('/interview');
    } else if (task.type === 'practice') {
      router.push({
        pathname: '/conversation',
        params: {
          scenario: task.scenario ?? '',
          focus: task.focusCategories?.join(',') ?? '',
        },
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
      setChecking(false);
    });
    if (notificationsSupported) {
      configureNotificationHandler();
    }
  }, []);

  // Refresh tiap kali home KEMBALI fokus -- angka & saran langsung update.
  useFocusEffect(
    useCallback(() => {
      fetchDashboard()
        .then(setDash)
        .catch(() => {});
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
      <GradientBackground>
        <View style={styles.centered}>
          <TalklyMark size={64} />
          <ActivityIndicator color={Ink} />
        </View>
      </GradientBackground>
    );
  }

  const name = email ? email.split('@')[0] : 'there';
  const initial = (email?.[0] ?? 'T').toUpperCase();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.lockup}>
              <TalklyMark size={26} />
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

          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={styles.greetingTitle}>Hi {name},{'\n'}ready to practice?</Text>
            <Text style={styles.greetingCaption}>
              A few quiet minutes now, steadier nerves later.
            </Text>
          </View>

          {/* Interview-Day Countdown (kartu hero) */}
          {plan && plan.set && !plan.expired && (
            <Pressable onPress={openPlanTask} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <Card glow style={styles.countdownCard}>
                <View style={styles.countdownAccent} />
                <View style={styles.countdownBody}>
                  <SectionLabel>Countdown</SectionLabel>
                  <View style={styles.countdownNumRow}>
                    <Text style={styles.countdownNum}>{plan.daysLeft}</Text>
                    <Text style={styles.countdownUnit}>
                      {plan.daysLeft === 1 ? 'day until your' : 'days until your'}
                      {'\n'}
                      <Text style={styles.countdownRole}>{plan.role} interview</Text>
                    </Text>
                  </View>
                  <View style={styles.countdownTaskRow}>
                    <Text style={styles.countdownTaskLabel}>Today</Text>
                    <Text style={styles.countdownTaskText} numberOfLines={2}>
                      {plan.todayTask.title}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
          {plan && plan.set && plan.expired && (
            <Pressable
              onPress={() => router.push('/interview-date')}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <Card style={styles.planPrompt}>
                <Text style={styles.planPromptTitle}>Your interview date has passed</Text>
                <Text style={styles.planPromptSub}>
                  How did it go? Set your next interview date to keep prepping.
                </Text>
              </Card>
            </Pressable>
          )}
          {plan && !plan.set && (
            <Pressable
              onPress={() => router.push('/interview-date')}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <Card style={styles.planPrompt}>
                <Text style={styles.planPromptTitle}>Have an interview coming up?</Text>
                <Text style={styles.planPromptSub}>
                  Set the date and I will shape each day&apos;s practice around it.
                </Text>
              </Card>
            </Pressable>
          )}

          {/* Chip aksi cepat */}
          <View style={styles.chipsWrap}>
            <Chip label="Free chat" icon="message-circle" onPress={() => router.push('/conversation')} />
            <Chip label="Mock interview" icon="mic" onPress={() => router.push('/interview')} />
            {suggestion && (
              <Chip
                label="Targeted"
                icon="target"
                selected
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
          <SectionLabel style={styles.sectionSpacing}>Workspace</SectionLabel>
          <View style={styles.rows}>
            <ListRow
              pastel="ice"
              icon="message-circle"
              title="Conversations"
              value={dash ? `${dash.activity.totalSessions} sessions` : '...'}
              onPress={() => router.push('/conversation')}
            />
            <ListRow
              pastel="lilac"
              icon="mic"
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
              value={dash ? `${dash.streak.currentStreak} days` : '...'}
              onPress={() => router.push('/dashboard')}
            />
          </View>
        </ScrollView>

        <BottomNav
          active="home"
          onProgress={() => router.push('/dashboard')}
          onSettings={() => router.push('/settings')}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  scrollContent: { flexGrow: 1, padding: Spacing.four, paddingBottom: Spacing.five },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wordmark: { fontSize: 18, fontWeight: '800', color: Ink },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Pastel.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Pastel.lilacInk, fontSize: 14, fontWeight: '800' },
  greeting: { gap: Spacing.two, marginBottom: Spacing.four },
  greetingTitle: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: Ink },
  greetingCaption: { fontSize: 15, lineHeight: 21, color: '#60646C', fontWeight: '500' },
  countdownCard: { padding: 0, overflow: 'hidden', marginBottom: Spacing.four },
  countdownAccent: { width: 5, backgroundColor: Pastel.lilac },
  countdownBody: { flex: 1, padding: Spacing.four, gap: Spacing.two },
  countdownNumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  countdownNum: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '800',
    color: Ink,
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: { flex: 1, fontSize: 15, lineHeight: 20, color: '#60646C', fontWeight: '500' },
  countdownRole: { color: Ink, fontWeight: '700' },
  countdownTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: HairlineBorder,
  },
  countdownTaskLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Pastel.lilacInk,
    backgroundColor: Pastel.lilac,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  countdownTaskText: { flex: 1, fontSize: 14, color: Ink, fontWeight: '600' },
  planPrompt: { marginBottom: Spacing.four, gap: Spacing.one },
  planPromptTitle: { fontSize: 16, fontWeight: '700', color: Ink },
  planPromptSub: { fontSize: 14, lineHeight: 20, color: '#60646C', fontWeight: '500' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  sectionSpacing: { marginTop: Spacing.three, marginBottom: Spacing.two },
  rows: { gap: Spacing.two },
});
