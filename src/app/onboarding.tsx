import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { GradientBackground } from '@/components/gradient-background';
import { Chip, PrimaryButton, Placeholder } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Danger, HairlineBorder } from '@/constants/theme';
import { updateProfile, NATIVE_LANGUAGE_OPTIONS } from '@/lib/auth/api';
import { NetworkError } from '@/lib/api/client';

// Onboarding sekali setelah daftar: nama panggilan (opsional, utk sapaan
// "Hi Mateo") + bahasa sehari-hari (dipakai AI menulis penjelasan koreksi).
export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const trimmed = name.trim();
      await updateProfile(
        trimmed ? { nativeLanguage: selected, name: trimmed } : { nativeLanguage: selected },
      );
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
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>First, what should I call you?</Text>
          <TextInput
            placeholder="Your first name (optional)"
            placeholderTextColor={Placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={60}
            style={styles.nameInput}
          />

          <Text style={styles.title}>What language do you speak every day?</Text>
          <Text style={styles.subtitle}>
            I will explain your corrections in this language. You can change it anytime.
          </Text>

          <View style={styles.optionGrid}>
            {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={opt.value === selected}
                onPress={() => setSelected(opt.value)}
              />
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton
            label="Continue"
            onPress={handleContinue}
            disabled={!selected}
            loading={loading}
            style={styles.button}
          />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: Ink, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: '#60646C',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  nameInput: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HairlineBorder,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16,
    color: Ink,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  error: { color: Danger, textAlign: 'center', fontSize: 14, fontWeight: '500' },
  button: { marginTop: Spacing.three },
});
