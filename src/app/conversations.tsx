import { useCallback, useRef, useState } from 'react';
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
  criterionStatusLabel,
  criterionValidationLabel,
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
  const [loadedDetail, setDetail] = useState<SessionDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const isDetail = typeof sessionId === 'string' && sessionId.length > 0;
  const detail = loadedDetail?.id === sessionId ? loadedDetail : null;
  const practiceContext = detail?.transcript[0]?.practiceContext;
  const transferContext = detail?.transcript[0]?.transferContext;
  const requestSequence = useRef(0);
  const loadCurrent = useCallback(() => {
    const request = ++requestSequence.current;
    setFailed(false);
    if (isDetail) {
      setDetail(null);
      fetchConversationDetail(sessionId as string)
        .then(value => { if (requestSequence.current === request) setDetail(value); })
        .catch(() => { if (requestSequence.current === request) setFailed(true); });
    } else {
      setDetail(null);
      fetchConversationHistory()
        .then(value => { if (requestSequence.current === request) setSessions(value); })
        .catch(() => { if (requestSequence.current === request) setFailed(true); });
    }
  }, [isDetail, sessionId]);

  useFocusEffect(
    useCallback(() => {
      loadCurrent();
      return () => { requestSequence.current++; };
    }, [loadCurrent]),
  );

  const loading = !failed && (isDetail ? !detail : !sessions);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.nav}>
          <Pressable
            onPress={() => {
              if (isDetail) router.setParams({ sessionId: '' });
              else if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
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
            onRetry={loadCurrent}
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
                : detail.mode === 'answer_practice' ? 'Answer revision'
                : detail.mode === 'criterion_transfer' ? 'Guided application'
                : detail.mode === 'weekly_challenge' ? 'Weekly challenge · deferred'
                : 'Free chat'}{' '}
              · {formatDate(detail.createdAt)}
            </Text>
            {practiceContext && (
              <Card>
                <Text style={styles.bubbleText}>Original question: {practiceContext.originalQuestion}</Text>
                <Text style={styles.bubbleText}>Original answer: {practiceContext.originalAnswer}</Text>
                <Text style={styles.bubbleText}>One improvement: {practiceContext.selectedFix}</Text>
                <Text style={styles.bubbleText}>{practiceContext.instruction}</Text>
                <Text style={styles.bubbleText}>Success criterion: {practiceContext.successCriterion}</Text>
                <PrimaryButton label="View original interview"
                  onPress={() => router.push({ pathname: '/conversations', params: { sessionId: practiceContext.sourceSessionId } })} />
              </Card>
            )}
            {transferContext && (
              <Card>
                <Text style={styles.bubbleText}>Guided application · AI feedback</Text>
                <Text style={styles.bubbleText}>New question: {transferContext.selection.task.question}</Text>
                <Text style={styles.bubbleText}>Same criterion: {transferContext.selection.successCriterion}</Text>
                <Text style={styles.bubbleText}>{transferContext.selection.instruction}</Text>
                <PrimaryButton label="View source revision" onPress={() => router.push({ pathname: '/conversations', params: { sessionId: transferContext.selection.sourceRevisionSessionId } })} />
                <PrimaryButton label="View original interview" onPress={() => router.push({ pathname: '/conversations', params: { sessionId: transferContext.selection.sourceInterviewSessionId } })} />
              </Card>
            )}
            {detail.mode === 'answer_practice' && !detail.transcript.some(turn => turn.transferSelection !== undefined) && (
              <Card><Text style={styles.bubbleText}>No new question is linked to this saved revision. You can practice the same answer again.</Text></Card>
            )}
            {detail.transcript.map((msg, i) => (
              <View key={i} style={styles.msgGroup}>
                <MessageBubble role={msg.role}>
                  <Text style={[styles.bubbleText, { color: BubbleTextColor[msg.role] }]}>
                    {msg.content}
                  </Text>
                </MessageBubble>
                {msg.role === 'assistant' && msg.criterionCheck && (
                  <Card>
                    <Text style={styles.bubbleText}>AI feedback · {criterionStatusLabel(msg.criterionCheck.status)}</Text>
                    {msg.criterionCheck.evidenceQuote && <Text style={styles.bubbleText}>Evidence: “{msg.criterionCheck.evidenceQuote}”</Text>}
                    <Text style={styles.bubbleText}>{msg.criterionCheck.explanation}</Text>
                    {criterionValidationLabel(msg.criterionCheck.validationReason) && <Text style={styles.bubbleText}>{criterionValidationLabel(msg.criterionCheck.validationReason)}</Text>}
                    <Text style={styles.bubbleText}>This describes this guided answer; it does not establish mastery.</Text>
                  </Card>
                )}
                {msg.role === 'assistant' && msg.transferSelection !== undefined && (
                  <Card>
                    <Text style={styles.bubbleText}>{msg.transferSelection ? 'AI suggestion: a new question' : 'No new question selected'}</Text>
                    <Text style={styles.bubbleText}>{msg.transferReason}</Text>
                    {msg.transferSelection && <PrimaryButton label="Try a new question" onPress={() => router.push({ pathname: '/conversation', params: { transferSource: msg.transferSelection!.sourceRevisionSessionId, transferSelection: msg.transferSelection!.selectionId } })} />}
                  </Card>
                )}
                {msg.role === 'user' && msg.mistakes?.map((mistake, correctionIndex) => (
                  <Card key={correctionIndex}>
                    <Text style={styles.bubbleText}>{mistake.originalText} → {mistake.correctedText}</Text>
                    {mistake.note ? <Text style={styles.bubbleText}>{mistake.note}</Text> : null}
                  </Card>
                ))}
              </View>
            ))}
            {detail.mode !== 'weekly_challenge' && <PrimaryButton
              label="Practice this again"
              onPress={() =>
                router.push({ pathname: '/conversation', params: transferContext
                  ? { transferSource: transferContext.selection.sourceRevisionSessionId, transferSelection: transferContext.selection.selectionId }
                  : practiceContext
                  ? { practiceSource: practiceContext.sourceSessionId, practiceTarget: practiceContext.targetId }
                  : { scenario: detail.scenario, ...(detail.mode === 'mock_interview' ? { mode: 'interview', role: detail.interviewRole ?? 'General' } : {}) } })
              }
              style={styles.detailCta}
            />}
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
                          {s.mode === 'weekly_challenge' ? 'Weekly challenge · deferred · ' : s.mode === 'criterion_transfer' ? 'Guided application · ' : s.mode === 'answer_practice' ? 'Answer revision · ' : ''}{formatDate(s.createdAt)} · {s.messageCount}{' '}
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
