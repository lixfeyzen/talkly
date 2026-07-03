import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { Spacing, MaxContentWidth, AccentColor } from '@/constants/theme';
import { fetchCurrentUser } from '@/lib/auth/api';
import { fetchDashboard, type DashboardData } from '@/lib/dashboard/api';
import { fetchSuggestedScenario, type SuggestedScenario } from '@/lib/conversations/api';
import { notificationsSupported, configureNotificationHandler } from '@/lib/notifications';

// Font serif utk greeting besar (komponen khas referensi Lumina).
const SerifFont = Platform.select({ web: 'Georgia, serif', default: 'serif' });

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestedScenario | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      // Belum pilih bahasa native (akun baru) -> onboarding sekali.
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

  // Refresh tiap kali home KEMBALI fokus -- pulang dari sesi latihan, angka
  // workspace & saran latihan langsung update. Gagal fetch tidak memblokir.
  useFocusEffect(
    useCallback(() => {
      fetchDashboard()
        .then(setDash)
        .catch(() => {});
      fetchSuggestedScenario()
        .then(setSuggestion)
        .catch(() => {});
    }, []),
  );

  if (checking) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={AccentColor} />
        </View>
      </GradientBackground>
    );
  }

  const name = email ? email.split('@')[0] : 'there';
  const initial = (email?.[0] ?? 'T').toUpperCase();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header: wordmark kiri + avatar inisial kanan */}
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.wordmark}>
              ✦ Talkly
            </ThemedText>
            <Pressable onPress={() => router.push('/settings')} style={styles.avatar}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                {initial}
              </ThemedText>
            </Pressable>
          </View>

          {/* Greeting serif */}
          <View style={styles.greeting}>
            <ThemedText style={styles.greetingTitle}>
              Hi {name}, ready{'\n'}to practice?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.greetingCaption}>
              Sharpen your English conversations{'\n'}and nail your next interview
            </ThemedText>
          </View>

          {/* Chip aksi cepat */}
          <View style={styles.chipsWrap}>
            <Pressable onPress={() => router.push('/conversation')} style={styles.chip}>
              <ThemedText type="small">💬 Free chat</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/interview')} style={styles.chip}>
              <ThemedText type="small">🎤 Mock interview</ThemedText>
            </Pressable>
            {suggestion && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/conversation',
                    params: {
                      scenario: suggestion.scenario,
                      focus: suggestion.focusCategories.join(','),
                    },
                  })
                }
                style={[styles.chip, styles.chipAccent]}>
                <ThemedText type="small" style={{ color: '#FFFFFF' }}>
                  🎯 Targeted practice
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Workspace */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            Workspace
          </ThemedText>
          <View style={styles.rows}>
            <Pressable onPress={() => router.push('/conversation')}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: '#6C5CE7' }]}>
                  <ThemedText type="small">💬</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  Conversations
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {dash ? `${dash.activity.totalSessions} sessions` : '…'}
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable
              onPress={() =>
                dash?.latestReadiness
                  ? router.push({
                      pathname: '/interview-report',
                      params: { sessionId: dash.latestReadiness.sessionId },
                    })
                  : router.push('/interview')
              }>
              <ThemedView type="backgroundElement" style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: '#2BAE7A' }]}>
                  <ThemedText type="small">🎤</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  Interview readiness
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {dash?.latestReadiness ? `${dash.latestReadiness.score}/100` : 'not tested'}
                </ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={() => router.push('/dashboard')}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: '#D64B8A' }]}>
                  <ThemedText type="small">🔥</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.rowTitle}>
                  Streak
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {dash ? `${dash.streak.currentStreak} days` : '…'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>

          {/* Recent corrections */}
          {dash && dash.recentCorrections.length > 0 && (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                Recent corrections
              </ThemedText>
              <View style={styles.rows}>
                {dash.recentCorrections.slice(0, 2).map((c, i) => (
                  <ThemedView key={i} type="backgroundElement" style={styles.row}>
                    <ThemedText type="small" numberOfLines={1} style={styles.rowTitle}>
                      💬 {c.originalText} → {c.correctedText}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Bottom bar ala referensi */}
        <View style={styles.bottomBar}>
          <View style={styles.tabItem}>
            <ThemedText type="smallBold" style={{ color: AccentColor }}>
              ⌂
            </ThemedText>
            <ThemedText type="small" style={{ color: AccentColor }}>
              Home
            </ThemedText>
          </View>
          <Pressable onPress={() => router.push('/dashboard')} style={styles.tabItem}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ◔
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Progress
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={styles.tabItem}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ⚙
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Settings
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: { flexGrow: 1, padding: Spacing.four, paddingBottom: Spacing.six },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  wordmark: { fontSize: 18 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AccentColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  greetingTitle: {
    fontFamily: SerifFont,
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    color: '#F4F2FA',
  },
  greetingCaption: { textAlign: 'center', lineHeight: 18 },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  chip: {
    backgroundColor: '#1C1A26',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderWidth: 1,
    borderColor: '#2B2839',
  },
  chipAccent: { backgroundColor: AccentColor, borderColor: AccentColor },
  sectionLabel: { marginBottom: Spacing.two, marginTop: Spacing.two },
  rows: { gap: Spacing.two, marginBottom: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 16,
    padding: Spacing.three,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#211E2E',
  },
  tabItem: { alignItems: 'center', gap: 2, padding: Spacing.two },
});
