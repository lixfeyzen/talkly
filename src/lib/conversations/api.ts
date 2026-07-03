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
};

export async function sendMessage(params: {
  sessionId?: string;
  scenario?: string;
  targetLanguage?: string;
  focusCategories?: MistakeCategory[];
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
