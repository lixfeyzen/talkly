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
import {
  Chip,
  MessageBubble,
  BubbleTextColor,
  PrimaryButton,
} from '@/components/ui';
import {
  Spacing,
  MaxContentWidth,
  Ink,
  Placeholder,
  HairlineBorder,
  Danger,
  Pastel,
} from '@/constants/theme';
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
// Beachhead produk = belajar ENGLISH (keputusan market 2026-07-03). Kolom
// target_language tetap ada di DB -- ekspansi multi-bahasa nanti tinggal
// menghidupkan kembali picker-nya.
const TARGET_LANGUAGE = 'English';

type Message = { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[] };

export default function ConversationScreen() {
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
  // Cache URI audio TTS per index pesan -- replay tidak bayar ulang.
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
        // Transkrip masuk kotak input (bukan langsung kirim) -- user bisa
        // koreksi salah dengar Whisper sebelum membayar 1 panggilan GPT.
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
    if (speakingIndex !== null) return; // satu audio pada satu waktu
    setError(null);
    setSpeakingIndex(index);
    try {
      let uri = ttsCache.current.get(index);
      if (!uri) {
        uri = await fetchTtsAudioUri(text);
        ttsCache.current.set(index, uri);
      }
      // Perekaman men-set mode record; kembalikan agar playback keluar speaker.
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

  // ---- Layar pemilihan skenario (belum mulai) ----
  if (!started) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={8}>
            <Feather name="chevron-left" size={20} color={Ink} />
            <Text style={styles.backText}>Back</Text>
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

  // ---- Layar chat ----
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.chatHeader}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
              <Feather name="chevron-left" size={20} color={Ink} />
            </Pressable>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {isInterview
                ? `Mock interview · ${interviewRole}${
                    interviewProgress && !interviewProgress.finished
                      ? ` · Q${interviewProgress.questionNumber}/${interviewProgress.total}`
                      : interviewProgress?.finished
                        ? ' · Done'
                        : ' · Q1/5'
                  }`
                : `${scenario}`}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
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
                  <Pressable
                    onPress={() => playReply(i, msg.content)}
                    disabled={speakingIndex !== null}
                    style={styles.speakerButton}
                    hitSlop={8}>
                    <Feather name="volume-2" size={13} color="#60646C" />
                    <Text style={styles.speakerText}>
                      {speakingIndex === i ? 'Playing...' : 'Listen'}
                    </Text>
                  </Pressable>
                )}
                {!isInterview && msg.mistakes && msg.mistakes.length > 0 && (
                  <View style={styles.correctionCard}>
                    <Text style={styles.correctionLabel}>Correction</Text>
                    {msg.mistakes.map((m, mi) => (
                      <View key={mi} style={styles.correctionItem}>
                        <Text style={styles.correctionOriginal}>{m.originalText}</Text>
                        <Text style={styles.correctionFixed}>{m.correctedText}</Text>
                        {m.note ? <Text style={styles.correctionNote}>{m.note}</Text> : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
            {sending && (
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#60646C" />
              </View>
            )}
          </ScrollView>

          {error && <Text style={styles.error}>{error}</Text>}

          {interviewProgress?.finished ? (
            <PrimaryButton
              label="View my readiness report"
              onPress={() =>
                router.push({ pathname: '/interview-report', params: { sessionId: sessionId ?? '' } })
              }
              style={styles.reportButton}
            />
          ) : (
            <View style={styles.inputRow}>
              <Pressable
                onPress={toggleRecord}
                disabled={sending || transcribing}
                accessibilityRole="button"
                accessibilityLabel={recording ? 'Stop recording' : 'Record voice'}
                style={({ pressed }) => [
                  styles.micButton,
                  {
                    backgroundColor: recording ? Danger : '#FFFFFF',
                    borderColor: recording ? Danger : HairlineBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                {transcribing ? (
                  <ActivityIndicator size="small" color={Ink} />
                ) : (
                  <Feather name={recording ? 'square' : 'mic'} size={18} color={recording ? '#fff' : Ink} />
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
                  styles.sendButton,
                  { opacity: !input.trim() ? 0.4 : pressed ? 0.85 : 1 },
                ]}>
                <Feather name="arrow-up" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.two },
  backText: { color: Ink, fontSize: 15, fontWeight: '600' },
  pickTitle: { fontSize: 26, fontWeight: '800', color: Ink, marginTop: Spacing.three },
  pickSub: { fontSize: 15, lineHeight: 21, color: '#60646C', fontWeight: '500', marginBottom: Spacing.two },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  chatTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Ink },
  messages: { flex: 1 },
  messagesContent: { gap: Spacing.three, paddingVertical: Spacing.two },
  msgGroup: { gap: Spacing.one },
  bubbleText: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  speakerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: 4 },
  speakerText: { color: '#60646C', fontSize: 13, fontWeight: '600' },
  correctionCard: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HairlineBorder,
    padding: Spacing.three,
    gap: 4,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Pastel.mintInk,
    marginBottom: 2,
  },
  correctionItem: { gap: 2, marginBottom: Spacing.one },
  correctionOriginal: {
    fontSize: 14,
    color: '#8B8F98',
    textDecorationLine: 'line-through',
  },
  correctionFixed: { fontSize: 14, color: Pastel.mintInk, fontWeight: '700' },
  correctionNote: { fontSize: 13, color: '#60646C', fontStyle: 'italic', lineHeight: 18 },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F3F5',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  error: { color: Danger, fontSize: 14, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two, alignItems: 'center' },
  micButton: {
    borderRadius: 999,
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 999,
  },
  input: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 16, color: Ink },
  sendButton: {
    borderRadius: 999,
    width: 48,
    height: 48,
    backgroundColor: Ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: { marginVertical: Spacing.two },
});
