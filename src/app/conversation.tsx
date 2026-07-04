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
  'Job interview',
  'Tell me about yourself',
  'Salary negotiation',
  'Small talk with a colleague',
  'Client meeting Q&A',
  'Networking event',
];
const TARGET_LANGUAGE = 'English';
const CORRECTION_ACCENT = '#8B5CF0';

type Message = { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[] };

export default function ConversationScreen() {
  const scrollRef = useRef<ScrollView>(null);

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
  const [messages, setMessages] = useState<Message[]>(
    isInterview
      ? [
          {
            role: 'assistant',
            content: `Hi! I'll be your interviewer for this ${interviewRole} mock interview. There are 5 questions. Answer naturally, like a real interview. First: ${INTERVIEW_OPENER}`,
          },
        ]
      : [],
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ---- Pemilihan skenario (belum mulai) ----
  if (!started) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.pickSafe} edges={['top', 'bottom']}>
          <Pressable onPress={() => router.back()} style={styles.backTile} hitSlop={6}>
            <Feather name="chevron-left" size={18} color={Ink} />
          </Pressable>
          <Text style={styles.pickTitle}>What do you want to practice?</Text>
          <Text style={styles.pickSub}>Pick a scenario and we will start a calm, low-stakes chat.</Text>
          <View style={styles.optionRow}>
            {(scenario && !SCENARIOS.includes(scenario) ? [scenario, ...SCENARIOS] : SCENARIOS).map(
              (s) => (
                <Chip key={s} label={s} selected={s === scenario} onPress={() => setScenario(s)} />
              ),
            )}
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const headerTitle = isInterview ? 'Mock interview' : (scenario ?? 'Practice');
  const headerSub = isInterview
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
              <View style={styles.backTilePlaceholder} />
            </View>

            {/* Pesan */}
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}>
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

            {interviewProgress?.finished ? (
              <View style={styles.reportWrap}>
                <PrimaryButton
                  label="View my readiness report"
                  icon="file-text"
                  onPress={() =>
                    router.push({ pathname: '/interview-report', params: { sessionId: sessionId ?? '' } })
                  }
                />
              </View>
            ) : (
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
                    { opacity: !input.trim() ? 0.4 : pressed ? 0.85 : 1 },
                  ]}>
                  <Feather name="send" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pickSafe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  pickTitle: { fontSize: 26, fontWeight: '800', color: Ink, marginTop: Spacing.three },
  pickSub: { fontSize: 15, lineHeight: 21, color: '#60646C', fontWeight: '500', marginBottom: Spacing.two },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
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
  backTilePlaceholder: { width: 38, height: 38 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Ink },
  headerSub: { fontSize: 12, fontWeight: '500', color: '#60646C', marginTop: 1 },
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
