import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, Switch, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, Chip, ListRow, SectionLabel, PastelTile, BottomNav } from '@/components/ui';
import {
  Spacing,
  MaxContentWidth,
  Ink,
  Danger,
  Success,
  HairlineBorder,
  Pastel,
  Radius,
} from '@/constants/theme';
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
      setFeedback({ kind: 'ok', text: 'Saved. Corrections will be explained in this language.' });
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

  const name = email ? email.split('@')[0] : 'there';
  const initial = (email?.[0] ?? 'T').toUpperCase();
  const currentLanguage =
    NATIVE_LANGUAGE_OPTIONS.find((opt) => opt.value === selected)?.label ?? 'Not set';

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
              <Feather name="chevron-left" size={22} color={Ink} />
            </Pressable>
            <Text style={styles.title}>Settings</Text>
          </View>

          {/* Profile block */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarTile}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email ?? '…'}
              </Text>
            </View>
          </Card>

          {/* Account */}
          <SectionLabel style={styles.sectionSpacing}>Account</SectionLabel>

          <Card style={styles.languageCard}>
            <View style={styles.rowHead}>
              <PastelTile pastel="lilac" icon="globe" size={40} />
              <View style={styles.rowHeadText}>
                <Text style={styles.rowTitle}>Native language</Text>
                <Text style={styles.rowValue}>{currentLanguage}</Text>
              </View>
            </View>
            <Text style={styles.rowCaption}>
              The AI explains your corrections in this language.
            </Text>
            <View style={styles.chipsWrap}>
              {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={opt.value === selected}
                  onPress={() => handlePickLanguage(opt.value)}
                />
              ))}
            </View>
            {saving && <ActivityIndicator color={Ink} style={styles.savingSpinner} />}
            {feedback && (
              <Text style={feedback.kind === 'ok' ? styles.ok : styles.error}>{feedback.text}</Text>
            )}
          </Card>

          <ListRow
            pastel="ice"
            icon="lock"
            title="Change password"
            onPress={() => router.push('/forgot-password')}
          />

          {/* Notifications */}
          {notificationsSupported && (
            <>
              <SectionLabel style={styles.sectionSpacing}>Notifications</SectionLabel>
              <Card style={styles.reminderCard}>
                <PastelTile pastel="pink" icon="bell" size={40} />
                <View style={styles.reminderText}>
                  <Text style={styles.rowTitle}>Daily practice reminder</Text>
                  <Text style={styles.rowValue}>Every day at 7 PM</Text>
                </View>
                <Switch
                  value={reminderOn}
                  onValueChange={handleReminderToggle}
                  trackColor={{ true: Ink }}
                />
              </Card>
            </>
          )}

          {/* Sign out */}
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            style={({ pressed }) => [styles.signOutRow, { opacity: pressed ? 0.7 : 1 }]}>
            <Feather name="log-out" size={18} color={Danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>

        <BottomNav
          active="settings"
          onHome={() => router.push('/')}
          onProgress={() => router.push('/dashboard')}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  scrollContent: { flexGrow: 1, padding: Spacing.four, paddingBottom: Spacing.five },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.two,
  },
  title: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: Ink },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarTile: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Pastel.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Pastel.lilacInk, fontSize: 22, fontWeight: '800' },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontWeight: '700', color: Ink, textTransform: 'capitalize' },
  profileEmail: { fontSize: 14, fontWeight: '500', color: '#60646C' },
  sectionSpacing: { marginTop: Spacing.four, marginBottom: Spacing.two },
  languageCard: { gap: Spacing.two, marginBottom: Spacing.two },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowHeadText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Ink },
  rowValue: { fontSize: 14, fontWeight: '500', color: '#60646C' },
  rowCaption: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: '#8B8F98' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  savingSpinner: { alignSelf: 'flex-start' },
  ok: { fontSize: 14, fontWeight: '600', color: Success },
  error: { fontSize: 14, fontWeight: '600', color: Danger },
  reminderCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reminderText: { flex: 1, gap: 2 },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HairlineBorder,
    backgroundColor: '#FFFFFF',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: Danger },
});
