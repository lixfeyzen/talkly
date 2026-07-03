import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { register } from '@/lib/auth/api';
import { ApiError } from '@/lib/api/client';

export default function RegisterScreen() {
  const theme = useTheme();
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
      } else {
        setError('Gagal daftar, coba lagi.');
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
          Buat akun
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
        <ThemedView type="backgroundElement" style={styles.inputWrapper}>
          <TextInput
            placeholder="Password (minimal 8 karakter)"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: theme.text }]}
          />
        </ThemedView>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !email || !password}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: AccentColor, opacity: loading ? 0.6 : pressed ? 0.85 : 1 },
          ]}>
          {loading ? (
            <ActivityIndicator color={AccentColorOn} />
          ) : (
            <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
              Buat akun
            </ThemedText>
          )}
        </Pressable>

        <Link href="/login" style={styles.link}>
          <ThemedText type="link">Sudah punya akun? Login</ThemedText>
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
