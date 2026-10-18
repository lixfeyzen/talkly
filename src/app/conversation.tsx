import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
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
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GradientBackground } from '@/components/gradient-background';
import { Chip, MessageBubble, BubbleTextColor, ListenPill, TypingDots, PrimaryButton } from '@/components/ui';
import { Spacing, MaxContentWidth, Ink, Placeholder, HairlineBorder, Danger, Success, Font } from '@/constants/theme';
import { sendMessage, fetchConversationDetail, criterionStatusLabel, criterionValidationLabel,
  type Mistake, type MistakeCategory, type FrozenTaskSelection, type TransferContext, type CriterionCheck } from '@/lib/conversations/api';
import { buildInterviewOpener, INTERVIEW_ROLES, fetchReport, peekPendingJobPack, type AnswerPracticeContext } from '@/lib/interviews/api';
import { ApiError } from '@/lib/api/client';
import { WEEKLY_CHALLENGE_ENABLED, isWeeklyMode } from '@/lib/features/v1';
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

type Message = { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[];
  transferSelection?: FrozenTaskSelection | null; transferReason?: string; criterionCheck?: CriterionCheck };

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
  const { mode, role, job } = useLocalSearchParams<{ mode?: string | string[]; role?: string; job?: string }>();
  if (!WEEKLY_CHALLENGE_ENABLED && isWeeklyMode(mode)) return <Redirect href="/" />;
  // Latihan dari lowongan: paketnya hidup di memori. Setelah halaman dimuat
  // ulang paketnya hilang, jadi kembali ke layar lowongan, bukan diam-diam
  // memakai pertanyaan umum.
  const jobRole = INTERVIEW_ROLES.find(r => r === role);
  if (mode === 'interview' && job === '1' && jobRole && !peekPendingJobPack(jobRole)) {
    return <Redirect href={{ pathname: '/interview-job', params: { role: jobRole } }} />;
  }
  return <ActiveConversationScreen />;
}

function ActiveConversationScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams<{
    scenario?: string;
    focus?: string;
    mode?: string;
    role?: string;
    preview?: string;
    retryRole?: string;
    practiceSource?: string;
    practiceTarget?: string;
    transferSource?: string;
    transferSelection?: string;
    job?: string;
  }>();
  const [practiceContext, setPracticeContext] = useState<AnswerPracticeContext | null>(null);
  const [practiceLocked, setPracticeLocked] = useState(false);
  const [transferContext, setTransferContext] = useState<TransferContext | null>(null);
  const [transferLocked, setTransferLocked] = useState(false);
  const [transferLoadError, setTransferLoadError] = useState<string | null>(null);
  const focusCategories =
    typeof params.focus === 'string' && params.focus.length > 0
      ? (params.focus.split(',') as MistakeCategory[])
      : undefined;
  const retryRole = INTERVIEW_ROLES.find(role => role === params.retryRole);
  const practiceSource = typeof params.practiceSource === 'string' ? params.practiceSource : undefined;
  const practiceTargetId = typeof params.practiceTarget === 'string' ? params.practiceTarget : undefined;
  const transferSource = typeof params.transferSource === 'string' ? params.transferSource : undefined;
  const transferSelectionId = typeof params.transferSelection === 'string' ? params.transferSelection : undefined;
  const conflictingReferences = Boolean((practiceSource || practiceTargetId) && (transferSource || transferSelectionId));
  const isTransfer = transferLocked || (!practiceLocked && Boolean(transferSource || transferSelectionId));
  const isAnswerPractice = practiceLocked || (!isTransfer && Boolean(practiceSource || practiceTargetId));
  const missingPracticeReference = isAnswerPractice && !practiceLocked && (!practiceSource || !practiceTargetId);
  const practiceReady = Boolean(practiceContext && (practiceLocked || (
    practiceContext.sourceSessionId === practiceSource && practiceContext.targetId === practiceTargetId
  )));
  const transferReady = Boolean(transferContext && (transferLocked || (!conflictingReferences &&
    transferContext.selection.sourceRevisionSessionId === transferSource && transferContext.selection.selectionId === transferSelectionId)));
  const isBoundPractice = isAnswerPractice || isTransfer;
  const boundReady = isTransfer ? transferReady : practiceReady;
  const missingTransferReference = isTransfer && !transferLocked && (!transferSource || !transferSelectionId || conflictingReferences);
  const interviewRole = !isBoundPractice && params.mode === 'interview'
    ? INTERVIEW_ROLES.find(role => role === params.role)
    : undefined;
  const isInterview = Boolean(interviewRole);
  const [jobPack] = useState(() => interviewRole && params.job === '1' ? peekPendingJobPack(interviewRole) : null);
  const interviewOpener = interviewRole ? buildInterviewOpener(interviewRole) : '';
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
  const [practiceLoadError, setPracticeLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (isBoundPractice) return [];
    if (isInterview) {
      return [
        {
          role: 'assistant',
          content: interviewOpener,
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
  const [hasPendingSend, setHasPendingSend] = useState(false);
  const sendInFlight = useRef(false);
  const pendingSend = useRef<{ params: Parameters<typeof sendMessage>[0]; index: number } | null>(null);

  useEffect(() => {
    if (practiceLocked || transferLocked || isTransfer || !practiceSource) return;
    let active = true;
    fetchReport(practiceSource)
      .then(report => {
        const context = report.practiceContext;
        if (!context || context.targetId !== practiceTargetId) throw new Error('No verified target');
        if (active) {
          setPracticeContext(context);
          setPracticeLoadError(null);
          setMessages([{ role: 'assistant', content: context.originalQuestion }]);
        }
      })
      .catch(() => {
        if (active) setPracticeLoadError('This answer revision is unavailable. Reopen the original report to choose a current practice.');
      });
    return () => { active = false; };
  }, [practiceSource, practiceTargetId, practiceLocked, transferLocked, isTransfer]);

  useEffect(() => {
    if (transferLocked || practiceLocked || !transferSource || !transferSelectionId || conflictingReferences) return;
    let active = true;
    fetchConversationDetail(transferSource).then(detail => {
      const selection = detail.mode === 'answer_practice' ? detail.transcript.find(turn =>
        turn.transferSelection?.selectionId === transferSelectionId && turn.transferSelection.sourceRevisionSessionId === transferSource)?.transferSelection : null;
      if (!selection) throw new Error('No saved new question');
      if (active) {
        setTransferContext({ kind: 'guided_application', selection });
        setTransferLoadError(null);
        ttsCache.current.clear();
        setMessages([{ role: 'assistant', content: selection.task.question }]);
      }
    }).catch(() => { if (active) setTransferLoadError('This new question is unavailable. Reopen your saved revision to choose a saved question.'); });
    return () => { active = false; };
  }, [transferSource, transferSelectionId, transferLocked, practiceLocked, conflictingReferences]);

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
        // Mock interview: jawaban suara langsung terkirim, tanpa diedit -- seperti interview asli.
        if (voiceFirst) {
          if (!text.trim()) throw new Error('empty transcript'); // diam/terlalu pelan -> pesan "Couldn't understand"
          await handleSend(text);
        }
        else setInput((prev) => (prev ? `${prev} ${text}` : text));
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

  // silent: putar otomatis boleh gagal diam-diam (mis. browser memblokir autoplay); tombol Listen tetap ada.
  async function playReply(index: number, text: string, silent = false) {
    if (speakingIndex !== null) return;
    if (!silent) setError(null);
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
      if (!silent) setError("Couldn't play the audio, try again.");
      setSpeakingIndex(null);
    }
  }

  // Mock interview = suara dulu. Ketik tetap tersedia lewat "Type instead" (mis. tanpa mikrofon).
  const [typeMode, setTypeMode] = useState(false);
  const voiceFirst = isInterview && !typeMode;
  const openerPlayed = useRef(false);
  useEffect(() => {
    if (!isInterview || openerPlayed.current) return;
    openerPlayed.current = true;
    void playReply(0, interviewOpener, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- putar pertanyaan pembuka sekali saat layar dibuka
  }, [isInterview]);

  const [interviewProgress, setInterviewProgress] = useState<{
    questionNumber: number;
    total: number;
    finished: boolean;
  } | null>(null);

  // Ganti skenario dari chip di atas chat (free-chat): mulai sesi bersih supaya
  // backend membuat percakapan baru dgn konteks skenario yang dipilih.
  function switchScenario(next: string) {
    if (isBoundPractice || next === scenario || sending || pendingSend.current) return;
    setScenario(next);
    setSessionId(undefined);
    setMessages([]);
    setInput('');
    setError(null);
  }

  // Mulai ulang sesi ini dari menu ⋮ (tanpa keluar layar). Free-chat: chat
  // dikosongkan; interview: kembali ke pertanyaan pembuka.
  function startOver() {
    if (sendInFlight.current) return;
    pendingSend.current = null;
    setHasPendingSend(false);
    setMenuOpen(false);
    setSessionId(undefined);
    setInput('');
    setError(null);
    setInterviewProgress(null);
    if (isTransfer) ttsCache.current.clear();
    setMessages(
      isInterview
        ? [
            {
              role: 'assistant',
              content: interviewOpener,
            },
          ]
        : isTransfer && transferContext ? [{ role: 'assistant', content: transferContext.selection.task.question }]
        : practiceContext ? [{ role: 'assistant', content: practiceContext.originalQuestion }] : [],
    );
  }

  // textOverride: jawaban suara mock interview dikirim langsung tanpa lewat kotak ketik.
  async function handleSend(textOverride?: string) {
    if (isBoundPractice && !boundReady) return;
    const draft = (textOverride ?? input).trim();
    if (sendInFlight.current || (!pendingSend.current && !draft)) return;
    if (!pendingSend.current) {
      if (isAnswerPractice) setPracticeLocked(true);
      if (isTransfer) setTransferLocked(true);
      const userText = draft;
      pendingSend.current = { index: messages.length, params: {
        requestId: randomUUID(), sessionId, scenario: isBoundPractice ? undefined : scenario ?? undefined,
        targetLanguage: TARGET_LANGUAGE, focusCategories: sessionId || isBoundPractice ? undefined : focusCategories,
        mode: !sessionId ? isTransfer ? 'criterion_transfer' : isAnswerPractice ? 'answer_practice' : isInterview ? 'mock_interview' : undefined : undefined,
        interviewRole: !sessionId && isInterview ? interviewRole : undefined, message: userText,
        practiceTarget: !sessionId && practiceContext
          && isAnswerPractice
          ? { sourceSessionId: practiceContext.sourceSessionId, targetId: practiceContext.targetId }
          : undefined,
        transferTarget: !sessionId && isTransfer && transferContext
          ? { sourceRevisionSessionId: transferContext.selection.sourceRevisionSessionId, selectionId: transferContext.selection.selectionId }
          : undefined,
        jobPack: !sessionId && isInterview && jobPack ? jobPack : undefined,
      }};
      setMessages((prev) => [...prev, { role: 'user', content: userText }]);
      setInput('');
    }
    const pending = pendingSend.current;
    sendInFlight.current = true;
    setHasPendingSend(true);
    setError(null);
    setSending(true);
    try {
      const res = await sendMessage(pending.params);
      setSessionId(res.sessionId);
      if (res.interview) setInterviewProgress(res.interview);
      if (res.practiceContext) setPracticeContext(res.practiceContext);
      if (res.transferContext) setTransferContext(res.transferContext);
      setMessages((prev) => {
        const next = [...prev];
        next[pending.index] = { ...next[pending.index], mistakes: res.mistakes };
        next.push({ role: 'assistant', content: res.reply,
          ...(res.transferSelection !== undefined ? { transferSelection: res.transferSelection, transferReason: res.transferReason } : {}),
          ...(res.criterionCheck ? { criterionCheck: res.criterionCheck } : {}) });
        return next;
      });
      pendingSend.current = null;
      setHasPendingSend(false);
      // Pertanyaan berikutnya diucapkan otomatis, seperti pewawancara sungguhan.
      if (isInterview && !res.interview?.finished) void playReply(pending.index + 1, res.reply, true);
    } catch (err) {
      const code = err instanceof ApiError ? (err.body as { error?: string } | null)?.error : undefined;
      if (err instanceof ApiError && ([400, 404].includes(err.status) || code === 'session_changed')) {
        setInput(pending.params.message);
        setMessages((prev) => prev.filter((_, i) => i !== pending.index));
        pendingSend.current = null;
        setHasPendingSend(false);
        setError('The session changed. Your answer is back in the message box.');
      } else if (code === 'request_in_progress') {
        setError('Your answer is still processing. Retry shortly to retrieve the result.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Practice limit reached. Your answer is kept here; retry after the limit resets.');
      } else {
        setError('Could not confirm delivery. Retry this answer to recover the same request.');
      }
    } finally {
      sendInFlight.current = false;
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const headerTitle = isTransfer ? 'New question' : isAnswerPractice ? 'Revise answer' : isPreview || isInterview ? 'Mock interview' : (scenario ?? 'Practice');
  const headerSub = isPreview
    ? 'Tell me about yourself'
    : isTransfer ? transferReady && transferContext ? `${transferContext.selection.interviewRole} · Guided application` : 'Loading your saved new question'
    : isAnswerPractice
    ? practiceReady && practiceContext ? `${practiceContext.interviewRole} · Answer ${practiceContext.answerNumber}` : 'Loading your original answer'
    : isInterview
    ? `${interviewRole}${jobPack ? ' · Job' : ''}${
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
            {!isInterview && !isBoundPractice && (
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
              {isAnswerPractice && !practiceReady && (
                <View style={styles.practiceCard}>
                  {!practiceLoadError && !missingPracticeReference && <ActivityIndicator color={Ink} />}
                  <Text style={styles.practiceText}>{practiceLoadError ?? (missingPracticeReference
                    ? 'Missing answer revision reference. Reopen the original report.'
                    : 'Loading your original question and one improvement…')}</Text>
                </View>
              )}
              {isTransfer && !transferReady && (
                <View style={styles.practiceCard}>
                  {!transferLoadError && !missingTransferReference && <ActivityIndicator color={Ink} />}
                  <Text style={styles.practiceText}>{transferLoadError ?? (missingTransferReference
                    ? 'Missing new question reference. Reopen your saved revision.' : 'Loading the saved question and criterion…')}</Text>
                </View>
              )}
              {isTransfer && transferReady && transferContext && (
                <View style={styles.practiceCard}>
                  <Text style={styles.practiceLabel}>Guided application</Text>
                  <Text style={styles.practiceText}>Answer the new question using the same criterion. You will receive AI feedback.</Text>
                  <Text style={[styles.practiceLabel, styles.practiceGap]}>Same criterion</Text>
                  <Text style={styles.practiceText}>{transferContext.selection.successCriterion}</Text>
                  <Text style={styles.practiceText}>{transferContext.selection.instruction}</Text>
                  <Text style={styles.practiceText}>{transferContext.selection.task.id === 'polite_request'
                    ? 'This is hypothetical. Write the polite request you would say; do not claim it happened.'
                    : 'Use another real example when available. If none fits, say so. Do not invent one.'}</Text>
                </View>
              )}
              {isAnswerPractice && practiceContext && practiceReady && (
                <View style={styles.practiceCard}>
                  <Text style={styles.practiceLabel}>Your original answer</Text>
                  <Text style={styles.practiceText}>{practiceContext.originalAnswer}</Text>
                  <Text style={[styles.practiceLabel, styles.practiceGap]}>One improvement</Text>
                  <Text style={styles.practiceText}>{practiceContext.selectedFix}</Text>
                  <Text style={styles.practiceText}>{practiceContext.instruction}</Text>
                  <Text style={[styles.practiceLabel, styles.practiceGap]}>Success criterion</Text>
                  <Text style={styles.practiceText}>{practiceContext.successCriterion}</Text>
                  <Text style={styles.practiceText}>Answer the same question below in your own words. Use only your real experience.</Text>
                </View>
              )}
              {messages.length === 0 && !isBoundPractice && (
                <View style={styles.emptyHint}>
                  <Text style={styles.emptyHintText}>
                    Say hello to start. I&apos;ll reply and gently fix any mistakes as we chat.
                  </Text>
                </View>
              )}
              {(!isBoundPractice || boundReady) && messages.map((msg, i) => (
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
                  {msg.role === 'assistant' && msg.criterionCheck && (
                    <View style={styles.practiceCard}>
                      <Text style={styles.practiceLabel}>AI feedback · {criterionStatusLabel(msg.criterionCheck.status)}</Text>
                      {msg.criterionCheck.evidenceQuote && <Text style={styles.practiceText}>Evidence: “{msg.criterionCheck.evidenceQuote}”</Text>}
                      <Text style={styles.practiceText}>{msg.criterionCheck.explanation}</Text>
                      {criterionValidationLabel(msg.criterionCheck.validationReason) && <Text style={styles.practiceText}>{criterionValidationLabel(msg.criterionCheck.validationReason)}</Text>}
                      <Text style={styles.practiceText}>This describes this guided answer; it does not establish mastery.</Text>
                    </View>
                  )}
                  {isAnswerPractice && msg.role === 'assistant' && msg.transferSelection !== undefined && (
                    <View style={styles.practiceCard}>
                      <Text style={styles.practiceLabel}>{msg.transferSelection ? 'Try the criterion on a new question' : 'No new question selected'}</Text>
                      <Text style={styles.practiceText}>{msg.transferReason}</Text>
                      {msg.transferSelection && <PrimaryButton label="Try a new question" disabled={sending || hasPendingSend}
                        onPress={() => router.push({ pathname: '/conversation', params: { transferSource: msg.transferSelection!.sourceRevisionSessionId, transferSelection: msg.transferSelection!.selectionId } })} />}
                    </View>
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
            {error && hasPendingSend && !sending && (
              <PrimaryButton label="Retry this answer" onPress={() => handleSend()} />
            )}

            {(interviewProgress?.finished || isPreview) && (
              <View style={styles.reportWrap}>
                <PrimaryButton
                  label="View my practice report"
                  icon="file-text"
                  iconLeft
                  onPress={() =>
                    router.push({ pathname: '/interview-report', params: { sessionId: sessionId ?? '' } })
                  }
                />
              </View>
            )}
            {!isInterview && !isBoundPractice && retryRole && messages.some(message => message.role === 'user') && (
              <View style={styles.reportWrap}>
                <PrimaryButton label="Try another interview for this role" disabled={sending || hasPendingSend}
                  onPress={() => router.push({ pathname: '/conversation', params: { mode: 'interview', role: retryRole } })} />
              </View>
            )}
            {isAnswerPractice && practiceContext && sessionId && (
              <View style={styles.reportWrap}>
                <PrimaryButton label="View saved revision" disabled={sending || hasPendingSend}
                  onPress={() => router.push({ pathname: '/conversations', params: { sessionId } })} />
              </View>
            )}
            {isTransfer && transferContext && sessionId && (
              <View style={styles.reportWrap}>
                <PrimaryButton label="View saved application" disabled={sending || hasPendingSend}
                  onPress={() => router.push({ pathname: '/conversations', params: { sessionId } })} />
              </View>
            )}
            {!interviewProgress?.finished && voiceFirst && (
              <View style={styles.voiceWrap}>
                <Pressable
                  onPress={toggleRecord}
                  disabled={sending || transcribing || hasPendingSend}
                  accessibilityRole="button"
                  accessibilityLabel={recording ? 'Stop and send your answer' : 'Answer by voice'}
                  style={({ pressed }) => [
                    styles.micBig,
                    { backgroundColor: recording ? Danger : Ink, opacity: pressed || sending || transcribing ? 0.7 : 1 },
                  ]}>
                  {transcribing || sending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Feather name={recording ? 'square' : 'mic'} size={28} color="#FFFFFF" />
                  )}
                </Pressable>
                <Text style={styles.micLabel}>
                  {recording ? 'Speaking… tap to finish your answer' : transcribing ? 'Sending your answer…' : sending ? 'Interviewer is thinking…' : 'Tap and answer out loud, like the real interview'}
                </Text>
                <Pressable onPress={() => setTypeMode(true)} disabled={recording} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.typeLink}>Type instead</Text>
                </Pressable>
              </View>
            )}
            {!interviewProgress?.finished && !voiceFirst && (
              <View style={styles.inputRow}>
                <Pressable
                  onPress={toggleRecord}
                  disabled={sending || transcribing || hasPendingSend || (isBoundPractice && !boundReady)}
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
                    editable={!sending && !hasPendingSend && (!isBoundPractice || boundReady)}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => handleSend()}
                    style={styles.input}
                  />
                </View>
                <Pressable
                  onPress={() => handleSend()}
                  disabled={sending || !input.trim() || (isBoundPractice && !boundReady)}
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
                      {isInterview ? 'Restart from the first question' : isTransfer ? 'Try this same new question again' : isAnswerPractice ? 'Try this same answer revision again' : 'Clear this chat and begin again'}
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
  practiceCard: { padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HairlineBorder, gap: 6 },
  practiceLabel: { fontSize: 12, fontFamily: Font.bold, color: Ink },
  practiceText: { fontSize: 14, lineHeight: 20, color: '#60646C' },
  practiceGap: { marginTop: 8 },
  emptyHint: { paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  emptyHintText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8B8F98',
    textAlign: 'center',
    fontFamily: Font.medium,
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
  menuItemText: { fontSize: 16, fontFamily: Font.semibold, color: Ink },
  menuItemSub: { fontSize: 13, color: '#60646C', marginTop: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontFamily: Font.bold, color: Ink },
  headerSub: { fontSize: 12, fontFamily: Font.medium, color: '#60646C', marginTop: 1 },
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
    fontFamily: Font.bold,
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
  correctionFixed: { flex: 1, fontSize: 13.5, lineHeight: 19, fontFamily: Font.semibold, color: Ink },
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
  error: { color: Danger, fontSize: 14, fontFamily: Font.medium, paddingHorizontal: 18 },
  reportWrap: { paddingHorizontal: 18, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 8 },
  voiceWrap: { alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 },
  micBig: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  micLabel: { fontSize: 13, fontFamily: Font.medium, color: '#60646C', textAlign: 'center' },
  typeLink: { fontSize: 13, fontFamily: Font.semibold, color: Ink, textDecorationLine: 'underline' },
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
