import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor } from '@/constants/theme';
import { fetchDashboard, categoryLabel, type DashboardData } from '@/lib/dashboard/api';

function formatLastPracticed(iso: string | null): string {
  if (!iso) return 'Belum pernah';
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  return `${diffDays} hari lalu`;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={AccentColor} />
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Gagal memuat data. Coba lagi nanti.
        </ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ThemedText type="link">← Kembali</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const hasData = data.activity.totalSessions > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="link">← Kembali</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Progresmu
          </ThemedText>

          {!hasData && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="default" themeColor="textSecondary">
                Belum ada data latihan. Mulai satu sesi percakapan dulu, nanti
                kelemahan & progresmu muncul di sini.
              </ThemedText>
            </ThemedView>
          )}

          {/* Ringkasan aktivitas */}
          <ThemedView style={styles.statRow}>
            <ThemedView type="backgroundElement" style={styles.statBox}>
              <ThemedText type="title" style={styles.statNumber}>
                {data.activity.totalSessions}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Sesi latihan
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.statBox}>
              <ThemedText type="title" style={styles.statNumber}>
                {data.activity.totalCorrections}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Koreksi diterima
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Terakhir latihan
            </ThemedText>
            <ThemedText type="smallBold">
              {formatLastPracticed(data.activity.lastPracticedAt)}
            </ThemedText>
          </ThemedView>

          {/* Kelemahan utama */}
          {data.topWeaknesses.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Kelemahan utamamu
              </ThemedText>
              {data.topWeaknesses.map((w) => (
                <ThemedView key={w.category} type="backgroundElement" style={styles.weaknessRow}>
                  <ThemedText type="default">{categoryLabel(w.category)}</ThemedText>
                  <ThemedView style={[styles.countBadge, { backgroundColor: AccentColor }]}>
                    <ThemedText type="smallBold" style={styles.countText}>
                      {w.occurrenceCount}×
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* Contoh koreksi terbaru */}
          {data.recentCorrections.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Koreksi terbaru
              </ThemedText>
              {data.recentCorrections.map((c, i) => (
                <ThemedView key={i} type="backgroundElement" style={styles.card}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.correctionCategory}>
                    {categoryLabel(c.category)}
                  </ThemedText>
                  <ThemedText type="default" style={{ color: theme.textSecondary }}>
                    {c.originalText}
                  </ThemedText>
                  <ThemedText type="default" style={{ color: AccentColor }}>
                    → {c.correctedText}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  content: { padding: Spacing.four, gap: Spacing.three },
  backLink: { marginBottom: Spacing.one },
  title: { marginBottom: Spacing.two },
  statRow: { flexDirection: 'row', gap: Spacing.three },
  statBox: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  statNumber: { fontSize: 36, lineHeight: 42 },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  sectionTitle: { marginBottom: Spacing.one },
  weaknessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  countBadge: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  countText: { color: '#ffffff' },
  correctionCategory: { marginBottom: Spacing.half },
});
