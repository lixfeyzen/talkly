import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, Chip, SectionLabel, Toggle, BottomNav } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Danger, Success, HairlineBorder, Pastel, Radius, Font } from '@/constants/theme';
import {
  fetchCurrentUser,
  logout,
  deleteAccount,
  setNativeLanguage,
  updateProfile,
  NATIVE_LANGUAGE_OPTIONS,
} from '@/lib/auth/api';
import { ApiError, NetworkError, rateLimitMessage } from '@/lib/api/client';
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
  const [userName, setUserName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (!user) {
          router.replace('/login');
          return;
        }
        setEmail(user.email);
        setSelected(user.nativeLanguage ?? null);
        setUserName(user.name ?? null);
        setNameDraft(user.name ?? '');
      })
      .catch(() => {
        // Error jaringan/server saat cek login, BUKAN 401 -- kemungkinan
        // besar sudah login, jadi tetap di layar ini dan kabari, jangan
        // lempar paksa ke /login.
        setFeedback({ kind: 'error', text: 'Can’t reach the server. Try again in a moment.' });
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

  async function handleDeleteAccount() {
    if (deleting) return;
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword);
      router.replace('/welcome');
    } catch (err) {
      setDeleteError(
        rateLimitMessage(err)
          ?? (err instanceof ApiError && err.status === 403 ? 'That password is not correct.'
          : err instanceof NetworkError ? "Can't reach Talkly. Check your connection and try again."
          : "Couldn't delete your account. Please try again."),
      );
    } finally {
      setDeleting(false);
    }
  }

  // Simpan nama panggilan (dipakai sapaan di Home). Kosong = tidak disimpan.
  async function handleSaveName() {
    const trimmed = nameDraft.trim();
    if (savingName || !trimmed || trimmed === userName) return;
    setSavingName(true);
    setFeedback(null);
    try {
      await updateProfile({ name: trimmed });
      setUserName(trimmed);
      setFeedback({ kind: 'ok', text: 'Name saved.' });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text:
          err instanceof NetworkError
            ? 'Can’t reach the server. Try again in a moment.'
            : 'Couldn’t save, try again.',
      });
    } finally {
      setSavingName(false);
    }
  }

  const name = userName ?? (email ? email.split('@')[0] : 'there');
  const initial = (userName?.[0] ?? email?.[0] ?? 'T').toUpperCase();
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
              {/* Nama panggilan (dipakai sapaan "Hi ..." di Home) */}
              <View style={styles.rowInline}>
                <SettingIcon name="user" />
                <Text style={styles.rowTitle}>Name</Text>
                <TextInput
                  placeholder="Your first name"
                  placeholderTextColor="#8B8F98"
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onSubmitEditing={handleSaveName}
                  autoCapitalize="words"
                  maxLength={60}
                  style={styles.nameInput}
                />
                {savingName ? (
                  <ActivityIndicator color={Ink} />
                ) : (
                  nameDraft.trim() !== (userName ?? '') &&
                  nameDraft.trim() !== '' && (
                    <Pressable
                      onPress={handleSaveName}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.nameSave, { opacity: pressed ? 0.7 : 1 }]}>
                      <Text style={styles.nameSaveText}>Save</Text>
                    </Pressable>
                  )
                )}
              </View>

              <View style={styles.divider} />

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

          {/* Hapus akun (syarat Google Play): tautan kecil, konfirmasi dengan password. */}
          {!deleteOpen ? (
            <Pressable
              onPress={() => setDeleteOpen(true)}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.deleteLink, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.deleteLinkText}>Delete account</Text>
            </Pressable>
          ) : (
            <View style={styles.deleteCard}>
              <Text style={styles.deleteTitle}>Delete your account?</Text>
              <Text style={styles.deleteBody}>
                This permanently deletes your account, conversations, interview reports and progress. It can&apos;t be undone.
              </Text>
              <TextInput
                value={deletePassword}
                onChangeText={(v) => { setDeletePassword(v); if (deleteError) setDeleteError(null); }}
                placeholder="Your password"
                placeholderTextColor="#686770"
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Password"
                onSubmitEditing={handleDeleteAccount}
                style={styles.deleteInput}
              />
              {deleteError && <Text style={styles.error} accessibilityLiveRegion="polite">{deleteError}</Text>}
              <Pressable
                onPress={handleDeleteAccount}
                accessibilityRole="button"
                disabled={deleting}
                style={({ pressed }) => [styles.deleteButton, { opacity: pressed || deleting ? 0.8 : 1 }]}>
                {deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteButtonText}>Delete my account</Text>}
              </Pressable>
              <Pressable
                onPress={() => { setDeleteOpen(false); setDeletePassword(''); setDeleteError(null); }}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => [styles.deleteLink, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}

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
  title: { fontSize: 23, lineHeight: 28, fontFamily: Font.extrabold, letterSpacing: -0.6, color: Ink },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: Pastel.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Pastel.lilacInk, fontSize: 18, fontFamily: Font.extrabold, letterSpacing: 0.3 },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontFamily: Font.bold, color: Ink, textTransform: 'capitalize' },
  profileEmail: { fontSize: 13, fontFamily: Font.medium, color: '#60646C' },

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
  rowTitle: { fontSize: 15, fontFamily: Font.semibold, color: Ink },
  rowValue: { fontSize: 14, fontFamily: Font.semibold, color: '#60646C' },
  nameInput: {
    flex: 1,
    minWidth: 0,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: HairlineBorder,
    backgroundColor: '#FAFAFB',
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Font.semibold,
    color: Ink,
    textAlign: 'right',
  },
  nameSave: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Ink,
  },
  nameSaveText: { color: '#FFFFFF', fontSize: 13, fontFamily: Font.bold },
  rowSub: { fontSize: 12.5, color: '#8B8F98', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F2F3F5', marginHorizontal: 15 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  savingSpinner: { alignSelf: 'flex-start' },
  ok: { fontSize: 14, fontFamily: Font.semibold, color: Success },
  error: { fontSize: 14, fontFamily: Font.semibold, color: Danger },

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
  signOutText: { fontSize: 15, fontFamily: Font.bold, color: Danger },

  deleteLink: { alignSelf: 'center', paddingVertical: Spacing.two },
  deleteLinkText: { fontSize: 13.5, fontFamily: Font.semibold, color: '#8B8F98', textDecorationLine: 'underline' },
  deleteCard: {
    gap: 10, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1,
    borderColor: '#F4D3CF', backgroundColor: '#FFFFFF',
  },
  deleteTitle: { fontSize: 16, fontFamily: Font.bold, color: Ink },
  deleteBody: { fontSize: 14, lineHeight: 20, fontFamily: Font.regular, color: '#55565E' },
  deleteInput: {
    height: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: HairlineBorder,
    paddingHorizontal: 14, fontSize: 15, fontFamily: Font.regular, color: Ink, backgroundColor: '#FFFFFF',
  },
  deleteButton: { height: 48, borderRadius: Radius.md, backgroundColor: Danger, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { fontSize: 15, fontFamily: Font.bold, color: '#FFFFFF' },
  cancelText: { fontSize: 14, fontFamily: Font.semibold, color: Ink },

  footer: { textAlign: 'center', fontSize: 12, color: '#A9ADB4', paddingTop: Spacing.one },

  navSafe: { backgroundColor: '#FFFFFF' },
});
