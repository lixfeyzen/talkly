import { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Chip, MessageBubble, BubbleTextColor, ListenPill, TypingDots, PrimaryButton } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Placeholder, HairlineBorder, Danger, Success } from '@/constants/theme';
import { sendMessage, type Mistake, type MistakeCategory } from '@/lib/conversations/api';
import { INTERVIEW_OPENER } from '@/lib/interviews/api';
import { ApiError } from '@/lib/api/client';
import { transcribeAudio, fetchTtsAudioUri } from '@/lib/speech/api';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
  createAudioPlayer,
} from 'expo-audio';

// Skenario di-target ke market: interview kerja & percakapan kantor English.
const SCENARIOS = [
  'About yourself',
  'Salary talk',
  'Networking',
  'Small talk',
  'Client meeting',
];
const TARGET_LANGUAGE = 'English';
const CORRECTION_ACCENT = '#8B5CF0';

type Message = { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[] };

// Percakapan contoh untuk PREVIEW DESAIN dev-only (?preview=1, hanya saat __DEV__).
// Menyalin frame mockup "02 Conversation" agar komponen bisa dibandingkan 1:1
// TANPA memanggil AI. Tidak pernah tampil untuk user sungguhan.
const PREVIEW_MESSAGES: Message[] = [
  { role: 'assistant', content: "Let's begin. Tell me a little about yourself and your background." },
  {
    role: 'user',
    content: 'Sure. I have 25 years and I work like software developer since three years.',
    mistakes: [
      {
        category: 'tense_usage',
        originalText: 'I have 25 years and I work like software developer since three years.',
        correctedText: "I'm 25 years old and I've worked as a software developer for three years.",
        note: 'La edad se dice con "years old", y usamos "for + tiempo" en present perfect.',
      },
    ],
  },
  { role: 'assistant', content: "That's a good place to finish for today. Nicely done, Mateo." },
];

export default function ConversationScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams<{
    scenario?: string;
    focus?: string;
    mode?: string;
    role?: string;
    preview?: string;
  }>();
  const focusCategories =
    typeof params.focus === 'string' && params.focus.length > 0
      ? (params.focus.split(',') as MistakeCategory[])
      : undefined;
  const isInterview = params.mode === 'interview' && typeof params.role === 'string';
  const interviewRole = isInterview ? (params.role as string) : undefined;
  // Preview DESAIN dev-only: render frame mockup "02 Conversation" 1:1 (header,
  // pesan, koreksi, tombol report, input) TANPA AI. Hanya di __DEV__ + ?preview=1.
  const isPreview = __DEV__ && params.preview === '1';

  const [scenario, setScenario] = useState<string | null>(
    typeof params.scenario === 'string' && params.scenario.length > 0
      ? params.scenario
      : isInterview
        ? null
        : SCENARIOS[0],
  );
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (isInterview) {
      return [
        {
          role: 'assistant',
          content: `Hi! I'll be your interviewer for this ${interviewRole} mock interview. There are 5 questions. Answer naturally, like a real interview. First: ${INTERVIEW_OPENER}`,
        },
      ];
    }
    if (isPreview) return PREVIEW_MESSAGES;
    return [];
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // --- Voice mode ---
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const ttsCache = useRef<Map<number, string>>(new Map());
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  async function toggleRecord() {
    setError(null);
    if (recording) {
      setRecording(false);
      setTranscribing(true);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) throw new Error('no recording uri');
        const mime = Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
        const text = await transcribeAudio(uri, mime);
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      } catch {
        setError("Couldn't understand the recording, try again.");
      } finally {
        setTranscribing(false);
      }
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Microphone permission is needed for voice practice.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  async function playReply(index: number, text: string) {
    if (speakingIndex !== null) return;
    setError(null);
    setSpeakingIndex(index);
    try {
      let uri = ttsCache.current.get(index);
      if (!uri) {
        uri = await fetchTtsAudioUri(text);
        ttsCache.current.set(index, uri);
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri });
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          player.remove();
          setSpeakingIndex(null);
        }
      });
      player.play();
    } catch {
      setError("Couldn't play the audio, try again.");
      setSpeakingIndex(null);
    }
  }

  const [interviewProgress, setInterviewProgress] = useState<{
    questionNumber: number;
    total: number;
    finished: boolean;
  } | null>(null);

  // Ganti skenario dari chip di atas chat (free-chat): mulai sesi bersih supaya
  // backend membuat percakapan baru dgn konteks skenario yang dipilih.
  function switchScenario(next: string) {
    if (next === scenario || sending) return;
    setScenario(next);
    setSessionId(undefined);
    setMessages([]);
    setInput('');
    setError(null);
  }

  // Mulai ulang sesi ini dari menu ⋮ (tanpa keluar layar). Free-chat: chat
  // dikosongkan; interview: kembali ke pertanyaan pembuka.
  function startOver() {
    setMenuOpen(false);
    setSessionId(undefined);
    setInput('');
    setError(null);
    setInterviewProgress(null);
    setMessages(
      isInterview
        ? [
            {
              role: 'assistant',
              content: `Hi! I'll be your interviewer for this ${interviewRole} mock interview. There are 5 questions. Answer naturally, like a real interview. First: ${INTERVIEW_OPENER}`,
            },
          ]
        : [],
    );
  }

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

  const headerTitle = isPreview || isInterview ? 'Mock interview' : (scenario ?? 'Practice');
  const headerSub = isPreview
    ? 'Tell me about yourself'
    : isInterview
    ? `${interviewRole}${
        interviewProgress && !interviewProgress.finished
          ? ` · Q${interviewProgress.questionNumber}/${interviewProgress.total}`
          : interviewProgress?.finished
            ? ' · Done'
            : ' · Q1/5'
      }`
    : TARGET_LANGUAGE;

  // ---- Layar chat ----
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBackground>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.chatWrap}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <Pressable onPress={() => router.back()} style={styles.backTile} hitSlop={6}>
                <Feather name="chevron-left" size={18} color={Ink} />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerTitle}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {headerSub}
                </Text>
              </View>
              <Pressable
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Conversation options"
                style={styles.backTile}
                hitSlop={6}>
                <Feather name="more-vertical" size={18} color={Ink} />
              </Pressable>
            </View>

            {/* Chip skenario (free-chat): ganti konteks tanpa keluar layar */}
            {!isInterview && (
              <View style={styles.scenarioBar}>
                {(scenario && !SCENARIOS.includes(scenario) ? [scenario, ...SCENARIOS] : SCENARIOS).map(
                  (s) => (
                    <Chip
                      key={s}
                      label={s}
                      selected={s === scenario}
                      compact
                      onPress={() => switchScenario(s)}
                    />
                  ),
                )}
              </View>
            )}

            {/* Pesan */}
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}>
              {messages.length === 0 && (
                <View style={styles.emptyHint}>
                  <Text style={styles.emptyHintText}>
                    Say hello to start. I&apos;ll reply and gently fix any mistakes as we chat.
                  </Text>
                </View>
              )}
              {messages.map((msg, i) => (
                <View key={i} style={styles.msgGroup}>
                  <MessageBubble role={msg.role}>
                    <Text style={[styles.bubbleText, { color: BubbleTextColor[msg.role] }]}>
                      {msg.content}
                    </Text>
                  </MessageBubble>
                  {msg.role === 'assistant' && (
                    <ListenPill
                      playing={speakingIndex === i}
                      disabled={speakingIndex !== null}
                      onPress={() => playReply(i, msg.content)}
                    />
                  )}
                  {!isInterview && msg.mistakes && msg.mistakes.length > 0 && (
                    <View style={styles.correctionCard}>
                      <View style={styles.correctionHead}>
                        <Feather name="edit-3" size={13} color={CORRECTION_ACCENT} />
                        <Text style={styles.correctionLabel}>Correction</Text>
                      </View>
                      {msg.mistakes.map((m, mi) => (
                        <View key={mi} style={mi > 0 ? styles.correctionItemGap : undefined}>
                          <View style={styles.correctionRow}>
                            <Feather name="x" size={14} color={Danger} style={styles.correctionIcon} />
                            <Text style={styles.correctionOriginal}>{m.originalText}</Text>
                          </View>
                          <View style={styles.correctionRow}>
                            <Feather name="check" size={14} color={Success} style={styles.correctionIcon} />
                            <Text style={styles.correctionFixed}>{m.correctedText}</Text>
                          </View>
                          {m.note ? (
                            <View style={styles.correctionNoteRow}>
                              <Feather name="globe" size={13} color="#8B8F98" style={styles.correctionIcon} />
                              <Text style={styles.correctionNote}>{m.note}</Text>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {sending && <TypingDots />}
            </ScrollView>

            {error && <Text style={styles.error}>{error}</Text>}

            {(interviewProgress?.finished || isPreview) && (
              <View style={styles.reportWrap}>
                <PrimaryButton
                  label="View my readiness report"
                  icon="file-text"
                  iconLeft
                  onPress={() =>
                    router.push({ pathname: '/interview-report', params: { sessionId: sessionId ?? '' } })
                  }
                />
              </View>
            )}
            {!interviewProgress?.finished && (
              <View style={styles.inputRow}>
                <Pressable
                  onPress={toggleRecord}
                  disabled={sending || transcribing}
                  accessibilityRole="button"
                  accessibilityLabel={recording ? 'Stop recording' : 'Record voice'}
                  style={({ pressed }) => [
                    styles.iconTile,
                    { backgroundColor: recording ? Danger : '#F2F3F5', opacity: pressed ? 0.85 : 1 },
                  ]}>
                  {transcribing ? (
                    <ActivityIndicator size="small" color={Ink} />
                  ) : (
                    <Feather name={recording ? 'square' : 'mic'} size={19} color={recording ? '#fff' : Ink} />
                  )}
                </Pressable>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder={recording ? 'Recording... tap stop when done' : 'Message'}
                    placeholderTextColor={Placeholder}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={handleSend}
                    style={styles.input}
                  />
                </View>
                <Pressable
                  onPress={handleSend}
                  disabled={sending || !input.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  style={({ pressed }) => [
                    styles.sendTile,
                    { opacity: !input.trim() && !isPreview ? 0.4 : pressed ? 0.85 : 1 },
                  ]}>
                  <Feather name="send" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </View>

          <Modal
            visible={menuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuOpen(false)}>
            <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
              <View style={styles.menuSheet}>
                <View style={styles.menuHandle} />
                <Pressable
                  onPress={startOver}
                  accessibilityRole="button"
                  accessibilityLabel="Start over"
                  style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.6 : 1 }]}>
                  <Feather name="rotate-ccw" size={19} color={Ink} />
                  <View style={styles.flex}>
                    <Text style={styles.menuItemText}>Start over</Text>
                    <Text style={styles.menuItemSub}>
                      {isInterview ? 'Restart from the first question' : 'Clear this chat and begin again'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyHint: { paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  emptyHintText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8B8F98',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 280,
  },
  chatWrap: { flex: 1, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: HairlineBorder,
  },
  backTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(17,17,20,0.35)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 34,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E3E4E7',
    marginBottom: 6,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 },
  menuItemText: { fontSize: 16, fontWeight: '600', color: Ink },
  menuItemSub: { fontSize: 13, color: '#60646C', marginTop: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Ink },
  headerSub: { fontSize: 12, fontWeight: '500', color: '#60646C', marginTop: 1 },
  scenarioBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F5',
  },
  messagesContent: { gap: 11, paddingHorizontal: 18, paddingVertical: 14 },
  msgGroup: { gap: 0 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  correctionCard: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HairlineBorder,
    padding: 13,
    shadowColor: 'rgba(17,17,20,1)',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  correctionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#8B8F98',
  },
  correctionItemGap: { marginTop: 10 },
  correctionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 },
  correctionIcon: { marginTop: 2 },
  correctionOriginal: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#8B8F98',
    textDecorationLine: 'line-through',
  },
  correctionFixed: { flex: 1, fontSize: 13.5, lineHeight: 19, fontWeight: '600', color: Ink },
  correctionNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F3F5',
  },
  correctionNote: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#60646C' },
  error: { color: Danger, fontSize: 14, fontWeight: '500', paddingHorizontal: 18 },
  reportWrap: { paddingHorizontal: 18, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 8 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: { flex: 1, height: 44, backgroundColor: '#F2F3F5', borderRadius: 999, justifyContent: 'center' },
  input: { paddingHorizontal: 16, fontSize: 14, color: Ink },
  sendTile: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
