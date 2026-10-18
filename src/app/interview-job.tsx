import { useState } from 'react';
import { StyleSheet, Pressable, ScrollView, View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { GhostButton, PrimaryButton, SectionLabel } from '@/components/ui';
import { Ink, HairlineBorder, MaxContentWidth, Font, Brand, Placeholder, Danger, Radius } from '@/constants/theme';
import {
  INTERVIEW_ROLES, INTERVIEW_OPENER, JOB_TEXT_MAX, JOB_TEXT_MIN,
  createJobPack, setPendingJobPack, type JobPack,
} from '@/lib/interviews/api';
import { ApiError, NetworkError, rateLimitMessage } from '@/lib/api/client';

// Penutup tetap dari bank server (backend lib/ai/interview.ts).
const CLOSER_PREVIEW = 'Why should we hire you for this role?';

function errorMessage(err: unknown): string {
  const limited = rateLimitMessage(err);
  if (limited) return limited;
  if (err instanceof ApiError && err.status === 422) {
    return "This doesn't look like a job post. Paste the full job description, including the duties and requirements.";
  }
  if (err instanceof ApiError && err.status === 400) {
    return `Paste between ${JOB_TEXT_MIN} and ${JOB_TEXT_MAX.toLocaleString('en-US')} characters.`;
  }
  if (err instanceof NetworkError) return "Can't reach Talkly. Check your connection and try again.";
  return "Couldn't create your questions right now. Please try again.";
}

// Latihan dari lowongan: tempel lowongan -> 3 pertanyaan khusus pekerjaan itu
// (ditambah pembuka dan penutup tetap) -> mock interview biasa.
export default function InterviewJobScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = INTERVIEW_ROLES.find(r => r === params.role) ?? 'General';
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<JobPack | null>(null);
  const length = text.trim().length;

  async function handleCreate() {
    if (loading) return;
    if (length < JOB_TEXT_MIN) {
      setError(length === 0 ? 'Paste a job post first.' : `Paste a bit more. A job post is usually at least ${JOB_TEXT_MIN} characters.`);
      return;
    }
    if (length > JOB_TEXT_MAX) {
      setError(`That's too long. Keep it under ${JOB_TEXT_MAX.toLocaleString('en-US')} characters.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setPack(await createJobPack(text.trim(), role));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    if (!pack) return;
    setPendingJobPack(role, pack);
    router.push({ pathname: '/conversation', params: { mode: 'interview', role, job: '1' } });
  }

  const questions = pack ? [INTERVIEW_OPENER, ...pack.questions, CLOSER_PREVIEW] : [];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/interview'))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
              <Feather name="chevron-left" size={18} color={Ink} />
            </Pressable>

            <Text style={styles.eyebrow}>{role} interview</Text>
            <Text style={styles.title}>{pack ? 'Your questions for this job' : 'Practice for a real job'}</Text>
            <Text style={styles.subtitle}>
              {pack
                ? 'Three questions are based on the job post. The first and last are asked in almost every interview.'
                : "Paste the job post you're applying for. I'll ask the questions this employer is likely to ask."}
            </Text>

            {!pack ? (
              <View style={styles.block}>
                <TextInput
                  value={text}
                  onChangeText={(v) => { setText(v); if (error) setError(null); }}
                  placeholder="Paste the full job post here"
                  placeholderTextColor={Placeholder}
                  multiline
                  textAlignVertical="top"
                  maxLength={JOB_TEXT_MAX + 500}
                  accessibilityLabel="Job post"
                  style={styles.input}
                />
                <Text style={[styles.counter, length > JOB_TEXT_MAX && styles.counterOver]}>
                  {length.toLocaleString('en-US')} / {JOB_TEXT_MAX.toLocaleString('en-US')}
                </Text>
                <Text style={styles.note}>
                  Only the job post is used to write your questions. It isn&apos;t saved.
                </Text>
                {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
                <PrimaryButton label="Create my questions" icon="arrow-right" loading={loading} onPress={handleCreate} />
              </View>
            ) : (
              <View style={styles.block}>
                <View style={styles.card}>
                  <SectionLabel>What they look for</SectionLabel>
                  {pack.requirements.map((r) => (
                    <View key={r} style={styles.reqRow}>
                      <Feather name="check" size={15} color={Brand.violet} style={styles.reqIcon} />
                      <Text style={styles.reqText}>{r}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <SectionLabel>Your 5 questions</SectionLabel>
                  {questions.map((q, i) => {
                    const fromJob = i > 0 && i < questions.length - 1;
                    return (
                      <View key={`${i}-${q}`} style={styles.qRow}>
                        <View style={[styles.qNum, fromJob && styles.qNumJob]}>
                          <Text style={[styles.qNumText, fromJob && styles.qNumTextJob]}>{i + 1}</Text>
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.qText}>{q}</Text>
                          {fromJob && <Text style={styles.qTag}>From the job post</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>

                <PrimaryButton label="Start interview" icon="arrow-right" onPress={handleStart} />
                <GhostButton label="Use a different job post" onPress={() => { setPack(null); setError(null); }} />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: HairlineBorder,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  eyebrow: { marginTop: 22, fontSize: 13, fontFamily: Font.semibold, color: Brand.violet },
  title: { marginTop: 6, fontSize: 26, lineHeight: 31, fontFamily: Font.extrabold, letterSpacing: -0.6, color: Ink },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 21, fontFamily: Font.regular, color: '#55565E' },
  block: { marginTop: 22, gap: 12 },
  input: {
    minHeight: 220, maxHeight: 360, borderRadius: Radius.md, borderWidth: 1, borderColor: HairlineBorder,
    backgroundColor: '#FFFFFF', padding: 14, fontSize: 15, lineHeight: 21, fontFamily: Font.regular, color: Ink,
  },
  counter: { alignSelf: 'flex-end', marginTop: -4, fontSize: 12.5, fontFamily: Font.medium, color: Placeholder },
  counterOver: { color: Danger },
  note: { fontSize: 13, lineHeight: 18, fontFamily: Font.regular, color: '#55565E' },
  error: { fontSize: 14, lineHeight: 19, fontFamily: Font.medium, color: Danger },
  card: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HairlineBorder, padding: 16, gap: 10 },
  reqRow: { flexDirection: 'row', gap: 8 },
  reqIcon: { marginTop: 2 },
  reqText: { flex: 1, fontSize: 14.5, lineHeight: 20, fontFamily: Font.medium, color: Ink },
  qRow: { flexDirection: 'row', gap: 11 },
  qNum: { width: 26, height: 26, borderRadius: 999, backgroundColor: '#F2F3F5', alignItems: 'center', justifyContent: 'center' },
  qNumJob: { backgroundColor: Brand.selectedBg },
  qNumText: { fontSize: 13, fontFamily: Font.bold, color: '#55565E' },
  qNumTextJob: { color: Brand.violet },
  qText: { fontSize: 14.5, lineHeight: 20, fontFamily: Font.medium, color: Ink },
  qTag: { marginTop: 3, fontSize: 12, fontFamily: Font.semibold, color: Brand.violet },
});
