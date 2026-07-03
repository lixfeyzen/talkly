import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PasswordInput } from '@/components/password-input';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { forgotPassword, resetPassword } from '@/lib/auth/api';
import { ApiError, NetworkError } from '@/lib/api/client';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestCode() {
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep('reset');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('Email tidak valid.');
      } else if (err instanceof NetworkError) {
        setError('Tidak bisa terhubung ke server. Coba beberapa saat lagi.');
      } else {
        setError('Gagal mengirim kode, coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email, code.trim(), newPassword);
      // Sukses -> ke login dengan pesan; token lama tidak dipulihkan otomatis.
      router.replace({ pathname: '/login', params: { resetDone: '1' } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const reason = (err.body as { error?: string } | null)?.error;
        if (reason === 'too_many_attempts') {
          setError('Terlalu banyak percobaan. Minta kode baru.');
        } else if (reason === 'invalid_input') {
          setError('Kode harus 6 digit dan password baru minimal 8 karakter.');
        } else {
          setError('Kode salah atau sudah kedaluwarsa.');
        }
      } else if (err instanceof NetworkError) {
        setError('Tidak bisa terhubung ke server. Coba beberapa saat lagi.');
      } else {
        setError('Gagal reset password, coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.brand}>
          TALKLY
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          Reset password
        </ThemedText>

        {step === 'email' ? (
          <>
            <ThemedText type="default" themeColor="textSecondary">
              Masukkan email akunmu. Kalau terdaftar, kami kirim kode 6 digit
              (berlaku 15 menit).
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: theme.text }]}
              />
            </ThemedView>

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}

            <Pressable
              onPress={handleRequestCode}
              disabled={loading || !email}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: AccentColor, opacity: loading ? 0.6 : pressed ? 0.85 : 1 },
              ]}>
              {loading ? (
                <ActivityIndicator color={AccentColorOn} />
              ) : (
                <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
                  Kirim kode
                </ThemedText>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <ThemedText type="default" themeColor="textSecondary">
              Kalau {email} terdaftar, kode 6 digit sudah dikirim ke sana.
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                placeholder="Kode 6 digit"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                style={[styles.input, { color: theme.text }]}
              />
            </ThemedView>
            <PasswordInput
              placeholder="Password baru (minimal 8 karakter)"
              value={newPassword}
              onChangeText={setNewPassword}
            />

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}

            <Pressable
              onPress={handleReset}
              disabled={loading || code.trim().length !== 6 || !newPassword}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: AccentColor, opacity: loading ? 0.6 : pressed ? 0.85 : 1 },
              ]}>
              {loading ? (
                <ActivityIndicator color={AccentColorOn} />
              ) : (
                <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
                  Reset password
                </ThemedText>
              )}
            </Pressable>

            <Pressable onPress={() => { setStep('email'); setError(null); }} style={styles.link}>
              <ThemedText type="link">Kirim ulang kode</ThemedText>
            </Pressable>
          </>
        )}

        <Link href="/login" style={styles.link}>
          <ThemedText type="link">← Kembali ke login</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  brand: { letterSpacing: 2 },
  title: { marginBottom: Spacing.two },
  inputWrapper: {
    borderRadius: Spacing.three,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  error: { color: '#d92d20' },
  link: { alignSelf: 'center', marginTop: Spacing.two },
});
