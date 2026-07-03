import { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { sendMessage, type Mistake, type MistakeCategory } from '@/lib/conversations/api';
import { INTERVIEW_OPENER } from '@/lib/interviews/api';
import { ApiError } from '@/lib/api/client';

// Skenario di-target ke market: interview kerja & percakapan kantor English.
const SCENARIOS = [
  'Job interview',
  'Tell me about yourself',
  'Salary negotiation',
  'Small talk with a colleague',
  'Client meeting Q&A',
  'Networking event',
];
// Beachhead produk = belajar ENGLISH (keputusan market 2026-07-03). Kolom
// target_language tetap ada di DB -- ekspansi multi-bahasa nanti tinggal
// menghidupkan kembali picker-nya.
const TARGET_LANGUAGE = 'English';

type Message = { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[] };

export default function ConversationScreen() {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Latihan terarah (fitur #3): home bisa membuka layar ini dengan skenario
  // adaptif + kategori fokus lewat route params. Mode interview (fitur #6)
  // juga lewat params. Tanpa params = alur biasa.
  const params = useLocalSearchParams<{
    scenario?: string;
    focus?: string;
    mode?: string;
    role?: string;
  }>();
  const focusCategories =
    typeof params.focus === 'string' && params.focus.length > 0
      ? (params.focus.split(',') as MistakeCategory[])
      : undefined;
  const isInterview = params.mode === 'interview' && typeof params.role === 'string';
  const interviewRole = isInterview ? (params.role as string) : undefined;

  const [scenario, setScenario] = useState<string | null>(
    typeof params.scenario === 'string' && params.scenario.length > 0 ? params.scenario : null,
  );
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  // Interview dibuka dengan bubble interviewer berisi pertanyaan pembuka
  // (teksnya konstanta backend) -- tanpa panggilan AI.
  const [messages, setMessages] = useState<Message[]>(
    isInterview
      ? [
          {
            role: 'assistant',
            content: `Hi! I'll be your interviewer for this ${interviewRole} mock interview. There are 5 questions — answer naturally, like a real interview. First: ${INTERVIEW_OPENER}`,
          },
        ]
      : [],
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewProgress, setInterviewProgress] = useState<{
    questionNumber: number;
    total: number;
    finished: boolean;
  } | null>(null);

  const started = scenario !== null || isInterview;

  async function handleSend() {
    if (!input.trim() || sending) return;
    const userText = input.trim();
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setSending(true);

    try {
      const res = await sendMessage({
        sessionId,
        scenario: scenario ?? undefined,
        targetLanguage: TARGET_LANGUAGE,
        // Hanya relevan saat membuat sesi baru; sesi lanjutan pakai fokus/
        // mode yang sudah tersimpan di server.
        focusCategories: sessionId ? undefined : focusCategories,
        mode: !sessionId && isInterview ? 'mock_interview' : undefined,
        interviewRole: !sessionId && isInterview ? interviewRole : undefined,
        message: userText,
      });
      setSessionId(res.sessionId);
      if (res.interview) setInterviewProgress(res.interview);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], mistakes: res.mistakes };
        next.push({ role: 'assistant', content: res.reply });
        return next;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 502) {
        setError('The AI is having trouble right now, try again in a moment.');
      } else {
        setError('Message failed to send, try again.');
      }
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  if (!started) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText type="link">← Back</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            What do you want to practice?
          </ThemedText>

          <ThemedText type="smallBold">Scenario</ThemedText>
          <ThemedView style={styles.optionRow}>
            {(scenario && !SCENARIOS.includes(scenario)
              ? [scenario, ...SCENARIOS]
              : SCENARIOS
            ).map((s) => (
              <Pressable
                key={s}
                onPress={() => setScenario(s)}
                style={[
                  styles.optionChip,
                  { backgroundColor: s === scenario ? AccentColor : theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={s === scenario ? { color: AccentColorOn } : undefined}>
                  {s}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle" style={styles.title}>
            {isInterview
              ? `Mock interview · ${interviewRole}${
                  interviewProgress && !interviewProgress.finished
                    ? ` — Question ${interviewProgress.questionNumber}/${interviewProgress.total}`
                    : interviewProgress?.finished
                      ? ' — Done!'
                      : ' — Question 1/5'
                }`
              : `${scenario} · ${TARGET_LANGUAGE}`}
          </ThemedText>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}>
            {messages.map((msg, i) => (
              <ThemedView
                key={i}
                type={msg.role === 'assistant' ? 'backgroundElement' : undefined}
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? [styles.bubbleUser, { backgroundColor: AccentColor }]
                    : styles.bubbleAssistant,
                ]}>
                <ThemedText type="default" style={msg.role === 'user' ? { color: AccentColorOn } : undefined}>
                  {msg.content}
                </ThemedText>
                {!isInterview && msg.mistakes && msg.mistakes.length > 0 && (
                  <ThemedView style={styles.mistakeNote}>
                    {msg.mistakes.map((m, mi) => (
                      <View key={mi} style={styles.mistakeItem}>
                        <ThemedText
                          type="small"
                          style={msg.role === 'user' ? styles.mistakeTextOnAccent : { color: theme.textSecondary }}>
                          {m.originalText} → {m.correctedText}
                        </ThemedText>
                        {m.note ? (
                          <ThemedText
                            type="small"
                            style={
                              msg.role === 'user'
                                ? styles.mistakeNoteOnAccent
                                : { color: theme.textSecondary }
                            }>
                            {m.note}
                          </ThemedText>
                        ) : null}
                      </View>
                    ))}
                  </ThemedView>
                )}
              </ThemedView>
            ))}
            {sending && <ActivityIndicator style={styles.typingIndicator} />}
          </ScrollView>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {interviewProgress?.finished ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/interview-report', params: { sessionId: sessionId ?? '' } })
              }
              style={({ pressed }) => [
                styles.reportButton,
                { backgroundColor: AccentColor, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
                View my readiness report →
              </ThemedText>
            </Pressable>
          ) : (
          <ThemedView style={styles.inputRow}>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                placeholder="Type your message..."
                placeholderTextColor={theme.textSecondary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                style={[styles.input, { color: theme.text }]}
              />
            </ThemedView>
            <Pressable
              onPress={handleSend}
              disabled={sending || !input.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: AccentColor, opacity: !input.trim() ? 0.5 : pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: AccentColorOn }}>
                Send
              </ThemedText>
            </Pressable>
          </ThemedView>
          )}
        </SafeAreaView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  backLink: { marginTop: Spacing.two },
  title: { marginVertical: Spacing.two },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  optionChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.five },
  messages: { flex: 1 },
  messagesContent: { gap: Spacing.two, paddingBottom: Spacing.three },
  bubble: { padding: Spacing.three, borderRadius: Spacing.three, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  mistakeNote: { marginTop: Spacing.two, gap: 2 },
  mistakeItem: { gap: 1, marginBottom: Spacing.one },
  mistakeTextOnAccent: { color: 'rgba(255,255,255,0.85)' },
  mistakeNoteOnAccent: { color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  typingIndicator: { alignSelf: 'flex-start', marginVertical: Spacing.two },
  error: { color: '#d92d20' },
  inputRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.three },
  inputWrapper: { flex: 1, borderRadius: Spacing.three },
  input: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 16 },
  sendButton: { borderRadius: Spacing.three, paddingHorizontal: Spacing.four, justifyContent: 'center' },
  reportButton: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
});
