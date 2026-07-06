import { apiFetch, AI_TIMEOUT_MS } from '@/lib/api/client';

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

type SendMessageResponse = {
  sessionId: string;
  reply: string;
  mistakes: Mistake[];
  // Terisi hanya di mode mock interview (fitur #6).
  interview?: { questionNumber: number; total: number; finished: boolean };
};

export async function sendMessage(params: {
  sessionId?: string;
  scenario?: string;
  targetLanguage?: string;
  focusCategories?: MistakeCategory[];
  mode?: 'free' | 'mock_interview';
  interviewRole?: string;
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
  mode: 'free' | 'mock_interview';
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
  mode: 'free' | 'mock_interview';
  interviewRole: string | null;
  createdAt: string;
  transcript: { role: 'user' | 'assistant'; content: string }[];
};

export async function fetchConversationDetail(sessionId: string): Promise<SessionDetail> {
  const res = await apiFetch<{ session: SessionDetail }>(`/api/conversations/${sessionId}`, {
    auth: true,
  });
  return res.session;
}
