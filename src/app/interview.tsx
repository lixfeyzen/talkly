import { useState } from 'react';
import { StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GradientBackground } from '@/components/gradient-background';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { INTERVIEW_ROLES } from '@/lib/interviews/api';

// Mulai mock interview (fitur #6): pilih role -> 5 pertanyaan -> rapor.
export default function InterviewStartScreen() {
  const theme = useTheme();
  const [role, setRole] = useState<string | null>(null);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="link">← Back</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            🎤 Mock interview
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            5 questions, just like a real English interview — no corrections
            until the end. You’ll get a readiness report with your score and
            stronger versions of your answers.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.label}>
            What role are you interviewing for?
          </ThemedText>
          <ThemedView style={styles.optionGrid}>
            {INTERVIEW_ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[
                  styles.optionChip,
                  { backgroundColor: r === role ? AccentColor : theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={r === role ? { color: AccentColorOn } : undefined}>
                  {r}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <Pressable
            onPress={() =>
              role &&
              router.push({ pathname: '/conversation', params: { mode: 'interview', role } })
            }
            disabled={!role}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: AccentColor, opacity: !role ? 0.4 : pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
              Start interview
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  backLink: { marginBottom: Spacing.one },
  title: { marginBottom: Spacing.half },
  label: { marginTop: Spacing.two },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, backgroundColor: 'transparent' },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  startButton: {
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
