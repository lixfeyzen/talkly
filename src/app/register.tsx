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
        setError('This email is already registered.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Password needs at least 8 characters and a valid email.');
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
      title={'Start your\nlanguage journey!'}
      topQuestion="Already have an account?"
      topAction="Sign in"
      onTopAction={() => router.push('/login')}>
      <AuthInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthPasswordInput
        placeholder="Password (min. 8 characters)"
        value={password}
        onChangeText={setPassword}
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
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center' },
});
