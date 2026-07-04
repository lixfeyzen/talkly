import { useState } from 'react';
import { StyleSheet, Pressable, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Card, Chip, PrimaryButton, SectionLabel, PastelTile } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink } from '@/constants/theme';
import { INTERVIEW_ROLES } from '@/lib/interviews/api';

// Cara kerja mock (3 baris di kartu putih). Tile pastel = identitas fitur:
// ice=Conversations, lilac=Interview/readiness, cream=Trajectory, mint=success.
const HOW_IT_WORKS = [
  { pastel: 'lilac', icon: 'help-circle', text: 'Five questions, like a real interview' },
  { pastel: 'ice', icon: 'pause-circle', text: 'No corrections until the very end' },
  { pastel: 'mint', icon: 'check-circle', text: 'A readiness report when you finish' },
] as const;

// Mulai mock interview (fitur #6): pilih role -> 5 pertanyaan -> rapor.
export default function InterviewStartScreen() {
  const [role, setRole] = useState<string | null>(null);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>A calm practice run.</Text>
          <Text style={styles.subtitle}>
            Five questions, like the real thing. I hold every correction until the end.
          </Text>

          <Card style={styles.howCard}>
            <SectionLabel>How it works</SectionLabel>
            <View style={styles.howRows}>
              {HOW_IT_WORKS.map((row) => (
                <View key={row.text} style={styles.howRow}>
                  <PastelTile pastel={row.pastel} icon={row.icon} size={34} />
                  <Text style={styles.howText}>{row.text}</Text>
                </View>
              ))}
            </View>
          </Card>

          <SectionLabel style={styles.roleLabel}>Choose a role</SectionLabel>
          <View style={styles.rolesWrap}>
            {INTERVIEW_ROLES.map((r) => (
              <Chip key={r} label={r} selected={r === role} onPress={() => setRole(r)} />
            ))}
          </View>

          <PrimaryButton
            label="Start interview"
            disabled={!role}
            onPress={() =>
              role &&
              router.push({ pathname: '/conversation', params: { mode: 'interview', role } })
            }
            style={styles.startButton}
          />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { flexGrow: 1, padding: Spacing.four, paddingBottom: Spacing.five },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.three },
  backText: { color: Ink, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: Ink },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#60646C',
    fontWeight: '500',
    marginTop: Spacing.two,
  },
  howCard: { marginTop: Spacing.four, gap: Spacing.three },
  howRows: { gap: Spacing.three },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  howText: { flex: 1, fontSize: 15, lineHeight: 20, color: Ink, fontWeight: '500' },
  roleLabel: { marginTop: Spacing.four, marginBottom: Spacing.three },
  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  startButton: { marginTop: Spacing.five },
});
