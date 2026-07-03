import { apiFetch } from '@/lib/api/client';

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
  message: string;
}): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>('/api/conversations', {
    method: 'POST',
    auth: true,
    body: params,
  });
}
