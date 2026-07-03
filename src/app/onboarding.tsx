import { useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { setNativeLanguage, NATIVE_LANGUAGE_OPTIONS } from '@/lib/auth/api';
import { NetworkError } from '@/lib/api/client';

// Onboarding sekali setelah daftar: pilih bahasa sehari-hari. Nilainya
// dipakai AI buat menulis penjelasan koreksi dalam bahasa user.
export default function OnboardingScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      await setNativeLanguage(selected);
      router.replace('/');
    } catch (err) {
      if (err instanceof NetworkError) {
        setError('Can’t reach the server. Try again in a moment.');
      } else {
        setError('Couldn’t save, try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            What language do you speak every day?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            The AI will explain your corrections in this language. You can
            change it anytime.
          </ThemedText>

          <ThemedView style={styles.optionGrid}>
            {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setSelected(opt.value)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor:
                      opt.value === selected ? AccentColor : theme.backgroundElement,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={opt.value === selected ? { color: AccentColorOn } : undefined}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={handleContinue}
            disabled={!selected || loading}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: AccentColor,
                opacity: !selected ? 0.4 : loading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}>
            {loading ? (
              <ActivityIndicator color={AccentColorOn} />
            ) : (
              <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
                Continue
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing.two },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  error: { color: '#d92d20', textAlign: 'center' },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
