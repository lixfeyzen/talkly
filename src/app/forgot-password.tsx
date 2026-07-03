import { useState } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

import {
  AuthLayout,
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthPalette,
} from '@/components/auth/auth-layout';
import { Spacing } from '@/constants/theme';
import { forgotPassword, resetPassword } from '@/lib/auth/api';
import { ApiError, NetworkError } from '@/lib/api/client';

export default function ForgotPasswordScreen() {
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
    <AuthLayout
      title={'Tenang, kita\nreset dulu.'}
      topQuestion="Ingat passwordmu?"
      topAction="Kembali ke login"
      onTopAction={() => router.push('/login')}>
      {step === 'email' ? (
        <>
          <Text style={styles.hint}>
            Masukkan email akunmu. Kalau terdaftar, kami kirim kode 6 digit (berlaku 15 menit).
          </Text>
          <AuthInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AuthButton
            label="Kirim kode"
            onPress={handleRequestCode}
            disabled={!email}
            loading={loading}
          />
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Kalau {email} terdaftar, kode 6 digit sudah dikirim ke sana.
          </Text>
          <AuthInput
            placeholder="Kode 6 digit"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <AuthPasswordInput
            placeholder="Password baru (minimal 8 karakter)"
            value={newPassword}
            onChangeText={setNewPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AuthButton
            label="Reset password"
            onPress={handleReset}
            disabled={code.trim().length !== 6 || !newPassword}
            loading={loading}
          />

          <Pressable
            onPress={() => {
              setStep('email');
              setError(null);
            }}
            hitSlop={Spacing.two}
            style={styles.resendLink}>
            <Text style={styles.resendText}>Kirim ulang kode</Text>
          </Pressable>
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  hint: { color: AuthPalette.textSecondary, fontSize: 14, lineHeight: 20 },
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center' },
  resendLink: { alignSelf: 'center', marginTop: Spacing.two },
  resendText: { color: AuthPalette.textPrimary, fontSize: 14, fontWeight: '600' },
});
