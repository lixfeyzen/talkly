import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, Switch, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn, CardShadow } from '@/constants/theme';
import { fetchCurrentUser } from '@/lib/auth/api';
import { fetchDashboard, type StreakData } from '@/lib/dashboard/api';
import { fetchSuggestedScenario, type SuggestedScenario } from '@/lib/conversations/api';
import {
  notificationsSupported,
  configureNotificationHandler,
  isDailyReminderEnabled,
  enableDailyReminder,
  disableDailyReminder,
} from '@/lib/notifications';

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestedScenario | null>(null);
  const [reminderOn, setReminderOn] = useState(false);

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
      isDailyReminderEnabled().then(setReminderOn);
    }
  }, []);

  // Refresh tiap kali home KEMBALI fokus (bukan cuma mount pertama) --
  // pulang dari sesi latihan, streak & saran latihan harus langsung update.
  // Gagal fetch bukan alasan blokir; cukup bagiannya tidak tampil.
  useFocusEffect(
    useCallback(() => {
      fetchDashboard()
        .then((d) => setStreak(d.streak))
        .catch(() => {});
      fetchSuggestedScenario()
        .then(setSuggestion)
        .catch(() => {});
    }, []),
  );

  async function handleReminderToggle(next: boolean) {
    if (next) {
      const granted = await enableDailyReminder();
      setReminderOn(granted); // izin ditolak -> toggle balik mati, jujur
    } else {
      await disableDailyReminder();
      setReminderOn(false);
    }
  }

  if (checking) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
      </ThemedView>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="small" themeColor="textSecondary">
              Welcome back,
            </ThemedText>
            <ThemedText type="smallBold">{email}</ThemedText>
          </View>
          {streak !== null && streak.currentStreak > 0 && (
            <View style={styles.streakBadge}>
              <ThemedText type="smallBold">🔥 {streak.currentStreak}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.hero}>
          <ThemedText type="title" style={styles.heroTitle}>
            Ready to practice{'\n'}your English?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.heroSubtitle}>
            Pick a scenario, chat with the AI, get instant corrections.
          </ThemedText>
        </View>

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
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: AccentColor }}>
              🎯 Targeted practice for you
            </ThemedText>
            <ThemedText type="smallBold">{suggestion.scenario}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {suggestion.reason}
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push('/conversation')}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: AccentColor, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
            Start practicing
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/interview')}
          style={({ pressed }) => [styles.card, styles.actionCard, { opacity: pressed ? 0.85 : 1 }]}>
          <View style={styles.actionText}>
            <ThemedText type="smallBold">🎤 Mock interview</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              5 questions + readiness report
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={{ color: AccentColor }}>
            →
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/dashboard')}
          style={({ pressed }) => [styles.card, styles.actionCard, { opacity: pressed ? 0.85 : 1 }]}>
          <View style={styles.actionText}>
            <ThemedText type="smallBold">📈 My progress</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Weak spots, streak & readiness score
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={{ color: AccentColor }}>
            →
          </ThemedText>
        </Pressable>

        {notificationsSupported && (
          <View style={styles.reminderRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Daily practice reminder (7 PM)
            </ThemedText>
            <Switch
              value={reminderOn}
              onValueChange={handleReminderToggle}
              trackColor={{ true: AccentColor }}
            />
          </View>
        )}

        <Pressable onPress={() => router.push('/settings')} style={styles.secondaryButton}>
          <ThemedText type="small" themeColor="textSecondary">
            Settings
          </ThemedText>
        </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  // flexGrow 1 + justify center: konten tetap di-tengah saat muat, tapi bisa
  // di-scroll (tidak kepotong) di HP layar pendek saat badge+kartu muncul.
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  headerText: { gap: 2 },
  hero: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  heroTitle: { fontSize: 30, lineHeight: 38 },
  heroSubtitle: {},
  primaryButton: {
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.two,
    ...CardShadow,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  // Kartu putih membulat ber-bayangan lembut -- blok bangunan khas brand.
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.three,
    ...CardShadow,
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  actionText: { gap: 2, flexShrink: 1 },
  streakBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...CardShadow,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
});
