import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, Chip, SectionLabel, Toggle, BottomNav } from '@/components/ui';
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

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// Tile ikon abu (38x38, r12) untuk baris di kartu Account/Notifications —
// disalin dari mockup Claude Design "08 Settings".
function SettingIcon({ name }: { name: FeatherName }) {
  return (
    <View style={styles.iconTile}>
      <Feather name={name} size={18} color={Ink} />
    </View>
  );
}

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
          <Text style={styles.title}>Settings</Text>

          {/* Profile block */}
          <Card style={styles.profileCard}>
            <View style={styles.avatar}>
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
          <View style={styles.section}>
            <SectionLabel style={styles.sectionLabel}>Account</SectionLabel>
            <View style={styles.groupCard}>
              {/* Native language + inline picker (chips = mekanisme yang sudah terpasang) */}
              <View style={styles.nativeBlock}>
                <View style={styles.rowInline}>
                  <SettingIcon name="globe" />
                  <Text style={[styles.rowTitle, styles.grow]}>Native language</Text>
                  <Text style={styles.rowValue}>{currentLanguage}</Text>
                </View>
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
                  <Text style={feedback.kind === 'ok' ? styles.ok : styles.error}>
                    {feedback.text}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              <Pressable
                onPress={() => router.push('/forgot-password')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
                <SettingIcon name="lock" />
                <Text style={[styles.rowTitle, styles.grow]}>Change password</Text>
                <Feather name="chevron-right" size={18} color="#8B8F98" />
              </Pressable>
            </View>
          </View>

          {/* Notifications */}
          {notificationsSupported && (
            <View style={styles.section}>
              <SectionLabel style={styles.sectionLabel}>Notifications</SectionLabel>
              <View style={styles.groupCard}>
                <View style={styles.row}>
                  <SettingIcon name="bell" />
                  <View style={styles.rowGrow}>
                    <Text style={styles.rowTitle}>Daily practice reminder</Text>
                    <Text style={styles.rowSub}>Every day at 7 PM</Text>
                  </View>
                  <Toggle on={reminderOn} onToggle={() => handleReminderToggle(!reminderOn)} />
                </View>
              </View>
            </View>
          )}

          {/* Sign out */}
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            style={({ pressed }) => [styles.signOutRow, { opacity: pressed ? 0.7 : 1 }]}>
            <Feather name="log-out" size={18} color={Danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          {/* Footer */}
          <Text style={styles.footer}>Talkly v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.navSafe}>
        <BottomNav
          active="settings"
          onHome={() => router.push('/')}
          onProgress={() => router.push('/dashboard')}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const CARD_SHADOW = {
  shadowColor: 'rgba(17,17,20,1)',
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  scrollContent: { flexGrow: 1, padding: Spacing.four, paddingBottom: Spacing.five, gap: 20 },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.6, color: Ink },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: Pastel.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Pastel.lilacInk, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontWeight: '700', color: Ink, textTransform: 'capitalize' },
  profileEmail: { fontSize: 13, fontWeight: '500', color: '#60646C' },

  section: { gap: 10 },
  sectionLabel: { paddingLeft: 2 },
  groupCard: {
    ...CARD_SHADOW,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HairlineBorder,
    overflow: 'hidden',
  },

  nativeBlock: { paddingVertical: 14, paddingHorizontal: 15, gap: 10 },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 15 },
  rowGrow: { flex: 1, gap: 2 },
  grow: { flex: 1 },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Ink },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#60646C' },
  rowSub: { fontSize: 12.5, color: '#8B8F98', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F2F3F5', marginHorizontal: 15 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  savingSpinner: { alignSelf: 'flex-start' },
  ok: { fontSize: 14, fontWeight: '600', color: Success },
  error: { fontSize: 14, fontWeight: '600', color: Danger },

  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#F4D3CF',
    backgroundColor: '#FFFFFF',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: Danger },

  footer: { textAlign: 'center', fontSize: 12, color: '#A9ADB4', paddingTop: Spacing.one },

  navSafe: { backgroundColor: '#FFFFFF' },
});
