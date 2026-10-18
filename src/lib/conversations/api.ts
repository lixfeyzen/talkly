import { apiFetch, AI_TIMEOUT_MS } from '@/lib/api/client';
import type { AnswerPracticeContext } from '@/lib/interviews/api';

export type MistakeCategory =
  | 'verb_conjugation'
  | 'tense_usage'
  | 'gender_agreement'
  | 'plural_agreement'
  | 'preposition_usage'
  | 'article_usage'
  | 'word_order'
  | 'vocabulary_choice'
  | 'other';

export type Mistake = {
  category: MistakeCategory;
  originalText: string;
  correctedText: string;
  // Penjelasan singkat dalam bahasa native user. Optional di type supaya
  // kompatibel dgn transkrip lama yang tersimpan tanpa field ini.
  note?: string;
};

export type FrozenTaskSelection = {
  kind: 'criterion_task'; selectionId: string; sourceRevisionSessionId: string;
  sourceInterviewSessionId: string; sourceTargetId: string; interviewRole: string;
  sourceQuestion: string; revisionAnswer: string; selectedFix: string; instruction: string;
  successCriterion: string; dimension: 'grammar' | 'structure' | 'content' | 'wording';
  task: { id: string; version: string; question: string; affordance: string };
  matchReason: string; excludedAnswers: string[];
};
export type TransferContext = { kind: 'guided_application'; selection: FrozenTaskSelection };
export type CriterionCheck = {
  status: 'observed' | 'not_observed' | 'not_assessable'; evidenceQuote: string | null;
  explanation: string;
  validationReason?: 'invalid_result' | 'invalid_quote' | 'missing_quote' | 'copied_answer' | 'no_answer';
};
export function criterionStatusLabel(status: CriterionCheck['status']): string {
  return status === 'observed' ? 'Criterion observed in this answer'
    : status === 'not_observed' ? 'Criterion not observed in this answer' : 'Criterion not assessable';
}
export function criterionValidationLabel(reason: CriterionCheck['validationReason']): string | null {
  if (!reason) return null;
  return ({invalid_result: 'The feedback could not be verified.', invalid_quote: 'The quote could not be confirmed in your answer.',
    missing_quote: 'The feedback did not provide a quote supporting this criterion.', copied_answer: 'This answer matches an earlier answer or example.',
    no_answer: 'There is no usable answer to assess.'})[reason];
}

type SendMessageResponse = {
  sessionId: string;
  reply: string;
  mistakes: Mistake[];
  // Terisi hanya di mode mock interview (fitur #6).
  interview?: { questionNumber: number; total: number; finished: boolean };
  practiceContext?: AnswerPracticeContext;
  transferSelection?: FrozenTaskSelection | null;
  transferReason?: string;
  transferContext?: TransferContext;
  criterionCheck?: CriterionCheck;
};

export async function sendMessage(params: {
  requestId: string;
  sessionId?: string;
  scenario?: string;
  targetLanguage?: string;
  focusCategories?: MistakeCategory[];
  mode?: 'free' | 'mock_interview' | 'answer_practice' | 'criterion_transfer';
  interviewRole?: string;
  practiceTarget?: { sourceSessionId: string; targetId: string };
  transferTarget?: { sourceRevisionSessionId: string; selectionId: string };
  // Latihan dari lowongan: paket bertanda tangan, hanya di giliran pertama.
  jobPack?: { requirements: string[]; questions: string[]; token: string };
  message: string;
}): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>('/api/conversations', {
    method: 'POST',
    auth: true,
    body: params,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

// Latihan terarah (fitur #3): saran skenario dari kelemahan user.
// suggestion null = user belum punya data kesalahan (tampilkan pilihan standar).
export type SuggestedScenario = {
  scenario: string;
  focusCategories: MistakeCategory[];
  reason: string;
};

export async function fetchSuggestedScenario(): Promise<SuggestedScenario | null> {
  const res = await apiFetch<{ suggestion: SuggestedScenario | null }>(
    '/api/scenarios/suggested',
    { auth: true },
  );
  return res.suggestion;
}

// Riwayat percakapan (layar history) -- ringkasan per sesi, terbaru dulu.
export type SessionSummary = {
  id: string;
  scenario: string;
  mode: 'free' | 'mock_interview' | 'answer_practice' | 'criterion_transfer' | 'weekly_challenge';
  interviewRole: string | null;
  createdAt: string;
  messageCount: number;
  lastMessage: string | null;
};

export async function fetchConversationHistory(): Promise<SessionSummary[]> {
  const res = await apiFetch<{ sessions: SessionSummary[] }>('/api/conversations', {
    auth: true,
  });
  return res.sessions;
}

// Detail satu sesi (transkrip penuh) untuk dibaca ulang.
export type SessionDetail = {
  id: string;
  scenario: string;
  mode: 'free' | 'mock_interview' | 'answer_practice' | 'criterion_transfer' | 'weekly_challenge';
  interviewRole: string | null;
  createdAt: string;
  transcript: { role: 'user' | 'assistant'; content: string; mistakes?: Mistake[]; practiceContext?: AnswerPracticeContext;
    transferContext?: TransferContext; transferSelection?: FrozenTaskSelection | null; transferReason?: string; criterionCheck?: CriterionCheck }[];
};

export async function fetchConversationDetail(sessionId: string): Promise<SessionDetail> {
  const res = await apiFetch<{ session: SessionDetail }>(`/api/conversations/${sessionId}`, {
    auth: true,
  });
  return res.session;
}
