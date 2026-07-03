import { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth, AccentColor, AccentColorOn } from '@/constants/theme';
import { sendMessage, type Mistake } from '@/lib/conversations/api';
import { ApiError } from '@/lib/api/client';

const SCENARIOS = ['Pesan kopi', 'Interview kerja', 'Tanya arah', 'Ngobrol santai'];
const LANGUAGES = ['Spanish', 'French', 'Japanese', 'English'];

type Message = { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[] };

export default function ConversationScreen() {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [scenario, setScenario] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const started = scenario !== null && language !== null;

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
        targetLanguage: language ?? undefined,
        message: userText,
      });
      setSessionId(res.sessionId);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], mistakes: res.mistakes };
        next.push({ role: 'assistant', content: res.reply });
        return next;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 502) {
        setError('AI lagi bermasalah, coba lagi sebentar.');
      } else {
        setError('Gagal kirim pesan, coba lagi.');
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
            <ThemedText type="link">← Kembali</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            Mau latihan apa?
          </ThemedText>

          <ThemedText type="smallBold">Bahasa target</ThemedText>
          <ThemedView style={styles.optionRow}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => setLanguage(lang)}
                style={[
                  styles.optionChip,
                  { backgroundColor: lang === language ? AccentColor : theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={lang === language ? { color: AccentColorOn } : undefined}>
                  {lang}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <ThemedText type="smallBold" style={{ marginTop: Spacing.three }}>
            Skenario
          </ThemedText>
          <ThemedView style={styles.optionRow}>
            {SCENARIOS.map((s) => (
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
            {scenario} · {language}
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
                {msg.mistakes && msg.mistakes.length > 0 && (
                  <ThemedView style={styles.mistakeNote}>
                    {msg.mistakes.map((m, mi) => (
                      <ThemedText
                        key={mi}
                        type="small"
                        style={msg.role === 'user' ? styles.mistakeTextOnAccent : { color: theme.textSecondary }}>
                        {m.originalText} → {m.correctedText}
                      </ThemedText>
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

          <ThemedView style={styles.inputRow}>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                placeholder="Ketik pesanmu..."
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
                Kirim
              </ThemedText>
            </Pressable>
          </ThemedView>
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
  mistakeTextOnAccent: { color: 'rgba(255,255,255,0.85)' },
  typingIndicator: { alignSelf: 'flex-start', marginVertical: Spacing.two },
  error: { color: '#d92d20' },
  inputRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.three },
  inputWrapper: { flex: 1, borderRadius: Spacing.three },
  input: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 16 },
  sendButton: { borderRadius: Spacing.three, paddingHorizontal: Spacing.four, justifyContent: 'center' },
});
