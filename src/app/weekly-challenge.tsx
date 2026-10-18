import { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { apiFetch, ApiError } from '@/lib/api/client';
import { GradientBackground } from '@/components/gradient-background';
import { Card, GhostButton, PrimaryButton, EmptyState } from '@/components/ui';
import { Spacing, Ink, Pastel, HairlineBorder, Radius, Success, Font } from '@/constants/theme';
import { WEEKLY_CHALLENGE_ENABLED } from '@/lib/features/v1';

// Warna sekunder (tidak ada di theme, pakai langsung).
const MUTED = '#8B8F98';

// Status challenge untuk tampilan.
type ChallengeStatus = 'locked' | 'available' | 'completed';

// Bentuk challenge dari API.
interface WeeklyChallenge {
  weekNumber: number;
  status: ChallengeStatus;
  scenario: string;
  focusCategory: string | null;
  score: number | null;
  completedAt: string | null;
}

export default function WeeklyChallengeScreen() {
  return WEEKLY_CHALLENGE_ENABLED ? <LegacyWeeklyChallengeScreen /> : <Redirect href="/" />;
}

function LegacyWeeklyChallengeScreen() {
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<{ challenges: WeeklyChallenge[] }>('/api/challenges', { auth: true })
      .then((data) => { if (active) setChallenges(data.challenges ?? []); })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
        else setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ActivityIndicator color={Ink} size="large" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={styles.errorText}>We could not load challenges. Try again later.</Text>
            <GhostButton label="Go back" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Empty state (seharusnya tidak terjadi — data layer auto-create) ──────
  if (challenges.length === 0) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Weekly challenges</Text>

            <EmptyState
              title="No challenges yet"
              subtitle="Challenge data is being set up. Please try again in a moment."
            />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // ── Content ──────────────────────────────────────────────────────────────
  const completedCount = challenges.filter(c => c.status === 'completed').length;
  const availableCount = challenges.filter(c => c.status === 'available').length;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Weekly challenges</Text>
          <Text style={styles.subtitle}>
            {completedCount} of {challenges.length} completed
          </Text>

          {/* Progress summary */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{completedCount}</Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{availableCount}</Text>
                <Text style={styles.summaryLabel}>Available</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{challenges.length}</Text>
                <Text style={styles.summaryLabel}>Total weeks</Text>
              </View>
            </View>
          </Card>

          {/* Challenge list */}
          <Text style={styles.subtitle}>This week</Text>
          {challenges.map(challenge => (
            <ChallengeCard
              key={challenge.weekNumber}
              challenge={challenge}
              onStart={() => handleStart(challenge)}
            />
          ))}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

// ── Challenge card ─────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onStart,
}: {
  challenge: WeeklyChallenge;
  onStart: () => void;
}) {
  const isLocked = challenge.status === 'locked';
  const isAvailable = challenge.status === 'available';
  const isCompleted = challenge.status === 'completed';

  return (
    <Card
      style={[
        styles.challengeCard,
        isLocked && styles.challengeLocked,
        isCompleted && styles.challengeCompleted,
      ]}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.challengeWeek}>
          <View style={[styles.weekBadge, isLocked && styles.weekBadgeLocked, isCompleted && styles.weekBadgeCompleted]}>
            <Text style={[styles.weekNumber, isLocked && styles.weekNumberLocked]}>
              Week {challenge.weekNumber}
            </Text>
          </View>
          <Text style={[styles.challengeStatus, isLocked && styles.statusLocked, isCompleted && styles.statusCompleted]}>
            {isLocked ? 'Locked' : isAvailable ? 'Available' : 'Completed'}
          </Text>
        </View>
        {isCompleted && challenge.score !== null && (
          <View style={styles.challengeScore}>
            <Feather name="star" size={18} color={Success} />
            <Text style={styles.scoreText}>{challenge.score}</Text>
          </View>
        )}
      </View>

      <Text style={styles.challengeScenario} numberOfLines={2}>
        {challenge.scenario}
      </Text>

      {challenge.focusCategory && (
        <Text style={styles.focusCategory}>Focus: {challenge.focusCategory.replace(/_/g, ' ')}</Text>
      )}

      {isAvailable && (
        <PrimaryButton
          label="Start challenge"
          onPress={onStart}
          style={styles.startButton}
        />
      )}

      {isLocked && (
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [
            styles.ghostButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.ghostButtonText}>Locked — complete previous week first</Text>
        </Pressable>
      )}
    </Card>
  );
}

// ── Handle start challenge ─────────────────────────────────────────────────

async function handleStart(challenge: WeeklyChallenge) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const res = await fetch(
      `http://localhost:3001/api/challenges/${challenge.weekNumber}/start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to start challenge');
    }

    await res.json(); // Challenge integration remains deferred outside v1.

    // Pindah ke halaman percakapan dengan scenario challenge.
    router.push(`/conversation?scenario=${encodeURIComponent(challenge.scenario)}&mode=weekly_challenge`);
  } catch (err) {
    console.error('Failed to start challenge:', err);
  }
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.two,
    paddingBottom: Spacing.four,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontFamily: Font.bold,
    color: Ink,
    marginBottom: Spacing.half,
  },
  subtitle: {
    fontSize: 16,
    color: MUTED,
    marginBottom: Spacing.two,
  },
  errorText: {
    fontSize: 16,
    color: Ink,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  summaryCard: {
    marginBottom: Spacing.two,
    padding: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: Font.bold,
    color: Ink,
  },
  summaryLabel: {
    fontSize: 14,
    color: MUTED,
    marginTop: Spacing.half,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: HairlineBorder,
  },
  challengeCard: {
    marginBottom: Spacing.two,
    padding: Spacing.two,
  },
  challengeLocked: {
    opacity: 0.6,
  },
  challengeCompleted: {
    borderColor: Success,
    borderWidth: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  challengeWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  weekBadge: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Radius.sm,
    backgroundColor: Pastel.lilacInk,
  },
  weekBadgeLocked: {
    backgroundColor: '#E5E7EB',
  },
  weekBadgeCompleted: {
    backgroundColor: Pastel.mint,
  },
  weekNumber: {
    fontSize: 14,
    fontFamily: Font.semibold,
    color: Ink,
  },
  weekNumberLocked: {
    color: MUTED,
  },
  challengeStatus: {
    fontSize: 14,
    color: Ink,
  },
  statusLocked: {
    color: MUTED,
  },
  statusCompleted: {
    color: Success,
  },
  challengeScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  scoreText: {
    fontSize: 18,
    fontFamily: Font.bold,
    color: Success,
  },
  challengeScenario: {
    fontSize: 16,
    color: Ink,
    marginBottom: Spacing.half,
  },
  focusCategory: {
    fontSize: 13,
    color: MUTED,
    marginBottom: Spacing.one,
  },
  startButton: {
    marginTop: Spacing.one,
  },
  ghostButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  ghostButtonText: {
    fontSize: 15,
    color: MUTED,
  },
  bottomPadding: {
    height: Spacing.four,
  },
});
