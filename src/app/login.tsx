import { useState } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  AuthLayout,
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthPalette,
} from '@/components/auth/auth-layout';
import { Spacing } from '@/constants/theme';
import { login } from '@/lib/auth/api';
import { ApiError, NetworkError } from '@/lib/api/client';

export default function LoginScreen() {
  const { resetDone } = useLocalSearchParams<{ resetDone?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong email or password.');
      } else if (err instanceof NetworkError) {
        setError('Can’t reach the server. Try again in a moment.');
      } else {
        setError('Sign-in failed, try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={'Welcome back!\nReady to practice?'}
      topQuestion="Don’t have an account?"
      topAction="Sign up"
      onTopAction={() => router.push('/register')}>
      <AuthInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthPasswordInput placeholder="Password" value={password} onChangeText={setPassword} />

      <Pressable
        onPress={() => router.push('/forgot-password')}
        hitSlop={Spacing.two}
        style={styles.forgotLink}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      {resetDone === '1' && !error && (
        <Text style={styles.success}>
          Password reset successful. Sign in with your new password.
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <AuthButton
        label="Sign in"
        onPress={handleSubmit}
        disabled={!email || !password}
        loading={loading}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotLink: { alignSelf: 'center' },
  forgotText: { color: AuthPalette.textPrimary, fontSize: 14, fontWeight: '600' },
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center' },
  success: { color: AuthPalette.success, fontSize: 14, textAlign: 'center' },
});
