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
import { Spacing, Font } from '@/constants/theme';
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
    if (loading) return;
    if (!email.trim()) {
      setError('Enter your account email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep('reset');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('That email doesn’t look valid.');
      } else if (err instanceof NetworkError) {
        setError('Can’t reach the server. Try again in a moment.');
      } else {
        setError('Couldn’t send the code, try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (loading) return;
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    if (!newPassword) {
      setError('Enter a new password.');
      return;
    }
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
          setError('Too many attempts. Request a new code.');
        } else if (reason === 'invalid_input') {
          setError('Code must be 6 digits and the new password at least 8 characters.');
        } else {
          setError('Wrong or expired code.');
        }
      } else if (err instanceof NetworkError) {
        setError('Can’t reach the server. Try again in a moment.');
      } else {
        setError('Password reset failed, try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        step === 'email'
          ? 'Enter your account email. If it’s registered, we’ll send a 6-digit code (valid for 15 minutes).'
          : `If ${email} is registered, a 6-digit code is on its way. Enter it and choose a new password.`
      }
      topQuestion="Remember your password?"
      topAction="Back to sign in"
      onTopAction={() => router.push('/login')}>
      {step === 'email' ? (
        <>
          <AuthInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            returnKeyType="go"
            onSubmitEditing={handleRequestCode}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AuthButton
            label="Send code"
            onPress={handleRequestCode}
            loading={loading}
          />
        </>
      ) : (
        <>
          <AuthInput
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            onSubmitEditing={handleReset}
          />
          <AuthPasswordInput
            placeholder="New password (min. 8 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            returnKeyType="go"
            onSubmitEditing={handleReset}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AuthButton
            label="Reset password"
            onPress={handleReset}
            loading={loading}
          />

          <Pressable
            onPress={() => {
              setStep('email');
              setError(null);
            }}
            hitSlop={Spacing.two}
            style={styles.resendLink}>
            <Text style={styles.resendText}>Resend code</Text>
          </Pressable>
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: AuthPalette.error, fontSize: 14, textAlign: 'center', fontFamily: Font.medium },
  resendLink: { alignSelf: 'center', marginTop: Spacing.two },
  resendText: { color: AuthPalette.textPrimary, fontSize: 14, fontFamily: Font.bold },
});
