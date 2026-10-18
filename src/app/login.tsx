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
import { Spacing, Font } from '@/constants/theme';
import { login } from '@/lib/auth/api';
import { ApiError, NetworkError, rateLimitMessage } from '@/lib/api/client';

export default function LoginScreen() {
  const { resetDone } = useLocalSearchParams<{ resetDone?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = !!email && !!password && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      const limited = rateLimitMessage(err);
      if (limited) {
        setError(limited);
      } else if (err instanceof ApiError && err.status === 401) {
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
      title="Welcome back."
      subtitle="Sign in to keep practicing for your interview."
      topQuestion="New to Talkly?"
      topAction="Create account"
      onTopAction={() => router.push('/register')}>
      <AuthInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={handleSubmit}
      />
      <AuthPasswordInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

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
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: { color: AuthPalette.textPrimary, fontSize: 14, fontFamily: Font.bold },
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center', fontFamily: Font.medium },
  success: { color: AuthPalette.success, fontSize: 14, textAlign: 'center', fontFamily: Font.medium },
});
