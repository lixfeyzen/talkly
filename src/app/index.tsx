import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { fetchCurrentUser, logout } from '@/lib/auth/api';
import { fetchDashboard, type StreakData } from '@/lib/dashboard/api';
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
  const [reminderOn, setReminderOn] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email);
      setChecking(false);
      // Streak buat badge -- gagal fetch bukan alasan blokir home, cukup
      // badge-nya tidak tampil.
      fetchDashboard()
        .then((d) => setStreak(d.streak))
        .catch(() => {});
    });
    if (notificationsSupported) {
      configureNotificationHandler();
      isDailyReminderEnabled().then(setReminderOn);
    }
  }, []);

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
                🔥 {streak.currentStreak} hari beruntun
              </ThemedText>
            </ThemedView>
          )}
          <ThemedText type="subtitle" style={styles.heroTitle}>
            Siap latihan ngobrol hari ini?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.heroSubtitle}>
            Pilih skenario, ngobrol sama AI, dapatkan koreksi langsung.
          </ThemedText>
        </ThemedView>

        <Pressable
          onPress={() => router.push('/conversation')}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: AccentColor, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
            Mulai latihan
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/dashboard')}
          style={({ pressed }) => [styles.secondaryOutlineButton, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold">Lihat progresku</ThemedText>
        </Pressable>

        {notificationsSupported && (
          <ThemedView style={styles.reminderRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Ingatkan latihan tiap hari (19:00)
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
            Keluar
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
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
