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
import { ApiError, NetworkError, rateLimitMessage } from '@/lib/api/client';
import { Font } from '@/constants/theme';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = !!email && !!password && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    // Cek lokal dulu (aturan sama dengan backend) supaya salah ketik tidak
    // makan jatah percobaan register.
    if (password.length < 8 || !/\S/.test(password)) {
      setError('Password needs at least 8 characters and can’t be only spaces.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
      router.replace('/');
    } catch (err) {
      const limited = rateLimitMessage(err);
      if (limited) {
        setError(limited);
      } else if (err instanceof ApiError && err.status === 409) {
        setError('This email is already registered.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please enter a valid email and a password of at least 8 characters.');
      } else if (err instanceof NetworkError) {
        setError('Can’t reach the server. Try again in a moment.');
      } else {
        setError('Sign-up failed, try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Practice real interview questions out loud. Talkly fixes what you say and remembers your weak spots."
      topQuestion="Already have an account?"
      topAction="Sign in"
      onTopAction={() => router.push('/login')}>
      <AuthInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={handleSubmit}
      />
      <AuthPasswordInput
        placeholder="Password (min. 8 characters)"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <AuthButton
        label="Create account"
        onPress={handleSubmit}
        disabled={!email || !password}
        loading={loading}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center', fontFamily: Font.medium },
});
