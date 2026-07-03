import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { fetchCurrentUser, logout } from '@/lib/auth/api';
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

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (checking) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.brand}>
            Talkly
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.hero}>
          {streak !== null && streak.currentStreak > 0 && (
            <ThemedView type="backgroundElement" style={styles.streakBadge}>
              <ThemedText type="smallBold">
                🔥 {streak.currentStreak}-day streak
              </ThemedText>
            </ThemedView>
          )}
          <ThemedText type="subtitle" style={styles.heroTitle}>
            Ready to practice speaking today?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.heroSubtitle}>
            Pick a scenario, chat with the AI, get instant corrections.
          </ThemedText>
        </ThemedView>

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
            style={({ pressed }) => [
              styles.suggestionCard,
              { borderColor: AccentColor, opacity: pressed ? 0.85 : 1 },
            ]}>
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
          onPress={() => router.push('/dashboard')}
          style={({ pressed }) => [styles.secondaryOutlineButton, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold">See my progress</ThemedText>
        </Pressable>

        {notificationsSupported && (
          <ThemedView style={styles.reminderRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Daily practice reminder (7 PM)
            </ThemedText>
            <Switch
              value={reminderOn}
              onValueChange={handleReminderToggle}
              trackColor={{ true: AccentColor }}
            />
          </ThemedView>
        )}

        <Pressable onPress={handleLogout} style={styles.secondaryButton}>
          <ThemedText type="small" themeColor="textSecondary">
            Log out
          </ThemedText>
        </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.six,
  },
  brand: { fontSize: 32, lineHeight: 38 },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  heroTitle: { textAlign: 'center' },
  heroSubtitle: { textAlign: 'center' },
  primaryButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryOutlineButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AccentColor,
    marginTop: Spacing.two,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  suggestionCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  streakBadge: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.one,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
});
