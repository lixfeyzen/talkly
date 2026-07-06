import { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import {
  Card,
  EmptyState,
  ErrorState,
  MessageBubble,
  BubbleTextColor,
  PrimaryButton,
  SectionLabel,
} from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, HairlineBorder, Pastel } from '@/constants/theme';
import {
  fetchConversationHistory,
  fetchConversationDetail,
  type SessionSummary,
  type SessionDetail,
} from '@/lib/conversations/api';

// Riwayat percakapan: daftar sesi (ringkas) -> tap -> transkrip penuh
// (read-only). Layar ini murni baca DB -- tidak pernah memanggil AI.

function formatDate(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffDays <= 0) return `Today, ${hm}`;
  if (diffDays === 1) return `Yesterday, ${hm}`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ConversationsScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const isDetail = typeof sessionId === 'string' && sessionId.length > 0;

  useFocusEffect(
    useCallback(() => {
      setFailed(false);
      if (isDetail) {
        fetchConversationDetail(sessionId as string)
          .then(setDetail)
          .catch(() => setFailed(true));
      } else {
        setDetail(null);
        fetchConversationHistory()
          .then(setSessions)
          .catch(() => setFailed(true));
      }
    }, [isDetail, sessionId]),
  );

  const loading = !failed && (isDetail ? !detail : !sessions);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.nav}>
          <Pressable
            onPress={() => (isDetail ? router.setParams({ sessionId: '' }) : router.back())}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={({ pressed }) => [styles.backTile, { opacity: pressed ? 0.6 : 1 }]}>
            <Feather name="chevron-left" size={18} color={Ink} />
          </Pressable>
          <Text style={styles.navTitle} numberOfLines={1}>
            {isDetail ? (detail?.scenario ?? 'Conversation') : 'Conversations'}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={Ink} />
          </View>
        )}

        {failed && (
          <ErrorState
            title="Could not load your conversations"
            subtitle="Check your connection and try again."
            onRetry={() => {
              setFailed(false);
              (isDetail
                ? fetchConversationDetail(sessionId as string).then(setDetail)
                : fetchConversationHistory().then(setSessions)
              ).catch(() => setFailed(true));
            }}
          />
        )}

        {/* DETAIL: transkrip read-only */}
        {!loading && !failed && isDetail && detail && (
          <ScrollView
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.detailMeta}>
              {detail.mode === 'mock_interview'
                ? `Mock interview · ${detail.interviewRole ?? ''}`
                : 'Free chat'}{' '}
              · {formatDate(detail.createdAt)}
            </Text>
            {detail.transcript.map((msg, i) => (
              <View key={i} style={styles.msgGroup}>
                <MessageBubble role={msg.role}>
                  <Text style={[styles.bubbleText, { color: BubbleTextColor[msg.role] }]}>
                    {msg.content}
                  </Text>
                </MessageBubble>
              </View>
            ))}
            <PrimaryButton
              label="Practice this again"
              onPress={() =>
                router.push({ pathname: '/conversation', params: { scenario: detail.scenario } })
              }
              style={styles.detailCta}
            />
          </ScrollView>
        )}

        {/* LIST: riwayat sesi */}
        {!loading && !failed && !isDetail && sessions && (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {sessions.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                subtitle="Your practice sessions will show up here."
                ctaLabel="Start practicing"
                onCta={() => router.push('/conversation')}
              />
            ) : (
              <>
                <SectionLabel style={styles.sectionLabel}>History</SectionLabel>
                {sessions.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => router.setParams({ sessionId: s.id })}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                    <Card style={styles.rowCard}>
                      <View
                        style={[
                          styles.rowTile,
                          {
                            backgroundColor:
                              s.mode === 'mock_interview' ? Pastel.lilac : Pastel.ice,
                          },
                        ]}>
                        <Feather
                          name={s.mode === 'mock_interview' ? 'briefcase' : 'message-circle'}
                          size={17}
                          color={s.mode === 'mock_interview' ? Pastel.lilacInk : Pastel.iceInk}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {s.scenario}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {formatDate(s.createdAt)} · {s.messageCount}{' '}
                          {s.messageCount === 1 ? 'message' : 'messages'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color="#8B8F98" />
                    </Card>
                  </Pressable>
                ))}
                <PrimaryButton
                  label="New conversation"
                  onPress={() => router.push('/conversation')}
                  style={styles.newCta}
                />
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backTile: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HairlineBorder,
  },
  navSpacer: { width: 38, height: 38 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Ink },

  listContent: { padding: Spacing.four, paddingTop: 6, gap: 8, flexGrow: 1 },
  sectionLabel: { paddingLeft: 2, marginBottom: 2 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 20 },
  rowTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Ink },
  rowSub: { fontSize: 12.5, fontWeight: '500', color: '#8B8F98', marginTop: 2 },
  newCta: { marginTop: 10 },

  detailContent: { padding: Spacing.four, paddingTop: 4, gap: 10, flexGrow: 1 },
  detailMeta: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8B8F98',
    textAlign: 'center',
    marginBottom: 4,
  },
  msgGroup: { gap: 6 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  detailCta: { marginTop: 12 },
});
