import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import {
  AuthLayout,
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthPalette,
} from '@/components/auth/auth-layout';
import { register } from '@/lib/auth/api';
import { ApiError, NetworkError } from '@/lib/api/client';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Email ini sudah terdaftar.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Password minimal 8 karakter, email harus valid.');
      } else if (err instanceof NetworkError) {
        setError('Tidak bisa terhubung ke server. Coba beberapa saat lagi.');
      } else {
        setError('Gagal daftar, coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={'Mulai perjalanan\nbahasamu!'}
      topQuestion="Sudah punya akun?"
      topAction="Masuk"
      onTopAction={() => router.push('/login')}>
      <AuthInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthPasswordInput
        placeholder="Password (minimal 8 karakter)"
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <AuthButton
        label="Buat akun"
        onPress={handleSubmit}
        disabled={!email || !password}
        loading={loading}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center' },
});
