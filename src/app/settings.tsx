import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn, CardShadow } from '@/constants/theme';
import {
  fetchCurrentUser,
  logout,
  setNativeLanguage,
  NATIVE_LANGUAGE_OPTIONS,
} from '@/lib/auth/api';
import { NetworkError } from '@/lib/api/client';
import {
  notificationsSupported,
  isDailyReminderEnabled,
  enableDailyReminder,
  disableDailyReminder,
} from '@/lib/notifications';

export default function SettingsScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [reminderOn, setReminderOn] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email);
      setSelected(user.nativeLanguage ?? null);
    });
    if (notificationsSupported) {
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

  async function handlePickLanguage(value: string) {
    if (saving || value === selected) return;
    const previous = selected;
    setSelected(value);
    setSaving(true);
    setFeedback(null);
    try {
      await setNativeLanguage(value);
      setFeedback({ kind: 'ok', text: 'Saved — corrections will be explained in this language.' });
    } catch (err) {
      setSelected(previous); // gagal -> balikin pilihan lama, jangan bohong di UI
      setFeedback({
        kind: 'error',
        text:
          err instanceof NetworkError
            ? 'Can’t reach the server. Try again in a moment.'
            : 'Couldn’t save, try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="link">← Back</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          {/* Akun */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Signed in as
            </ThemedText>
            <ThemedText type="smallBold">{email ?? '…'}</ThemedText>
          </ThemedView>

          {/* Bahasa native */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              My everyday language
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              The AI explains your corrections in this language.
            </ThemedText>
            <ThemedView style={styles.optionGrid}>
              {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => handlePickLanguage(opt.value)}
                  disabled={saving}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        opt.value === selected ? AccentColor : theme.backgroundElement,
                      opacity: saving ? 0.6 : 1,
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    style={opt.value === selected ? { color: AccentColorOn } : undefined}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
            {saving && <ActivityIndicator color={AccentColor} />}
            {feedback && (
              <ThemedText
                type="small"
                style={feedback.kind === 'ok' ? styles.ok : styles.error}>
                {feedback.text}
              </ThemedText>
            )}
          </ThemedView>

          {/* Reminder harian (native saja; web tak didukung expo-notifications) */}
          {notificationsSupported && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Reminder
              </ThemedText>
              <ThemedView type="backgroundElement" style={[styles.rowButton, styles.reminderRow]}>
                <View style={styles.reminderText}>
                  <ThemedText type="smallBold">Daily practice reminder</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Every day at 7 PM
                  </ThemedText>
                </View>
                <Switch
                  value={reminderOn}
                  onValueChange={handleReminderToggle}
                  trackColor={{ true: AccentColor }}
                />
              </ThemedView>
            </ThemedView>
          )}

          {/* Password */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Password
            </ThemedText>
            <Pressable
              onPress={() => router.push('/forgot-password')}
              style={({ pressed }) => [
                styles.rowButton,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold">Change password</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                We’ll email you a 6-digit code to set a new one.
              </ThemedText>
            </Pressable>
          </ThemedView>

          <Pressable onPress={handleLogout} style={styles.logout}>
            <ThemedText type="smallBold" style={styles.logoutText}>
              Log out
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, gap: Spacing.three },
  backLink: { marginBottom: Spacing.one },
  title: { marginBottom: Spacing.two },
  card: { ...CardShadow, borderRadius: 20, padding: Spacing.three, gap: Spacing.one },
  section: { gap: Spacing.two, marginTop: Spacing.two, backgroundColor: 'transparent' },
  sectionTitle: { marginBottom: Spacing.half },
  optionGrid: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  rowButton: { ...CardShadow, borderRadius: 20, padding: Spacing.three, gap: Spacing.one },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  reminderText: { gap: 2, flexShrink: 1 },
  // Warna status di latar gelap: versi terang biar terbaca.
  ok: { color: '#34C88A' },
  error: { color: '#FF7A70' },
  logout: { alignItems: 'center', paddingVertical: Spacing.three, marginTop: Spacing.four },
  logoutText: { color: '#FF7A70' },
});
