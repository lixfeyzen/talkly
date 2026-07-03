import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { fetchCurrentUser, logout } from '@/lib/auth/api';

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email);
      setChecking(false);
    });
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (checking) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.brand}>
            Talkly
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.hero}>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            Siap latihan ngobrol hari ini?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.heroSubtitle}>
            Pilih skenario, ngobrol sama AI, dapatkan koreksi langsung.
          </ThemedText>
        </ThemedView>

        <Pressable
          onPress={() => router.push('/conversation')}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: AccentColor, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
            Mulai latihan
          </ThemedText>
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.secondaryButton}>
          <ThemedText type="small" themeColor="textSecondary">
            Keluar
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', flexDirection: 'row' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.six,
  },
  brand: { fontSize: 32, lineHeight: 38 },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  heroTitle: { textAlign: 'center' },
  heroSubtitle: { textAlign: 'center' },
  primaryButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
});
