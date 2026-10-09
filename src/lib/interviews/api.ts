import { apiFetch, AI_TIMEOUT_MS } from '@/lib/api/client';

// Fitur #6 Interview Readiness -- client utk rapor mock interview.

export const INTERVIEW_ROLES = [
  'Software Engineer',
  'Marketing',
  'Sales',
  'Finance',
  'Designer',
  'General',
] as const;

export type InterviewRole = (typeof INTERVIEW_ROLES)[number];

// Pertanyaan pembuka SAMA untuk semua role (konstanta di backend
// lib/ai/interview.ts) -- ditampilkan client sebagai bubble pertama
// interviewer tanpa panggilan AI.
export const INTERVIEW_OPENER = 'Tell me about yourself and your background.';

// Keep the complete displayed opener aligned with backend lib/ai/interview.ts.
export function buildInterviewOpener(role: InterviewRole): string {
  return `Hi! I'll be your interviewer for this ${role} mock interview. There are 5 questions. Answer naturally, like a real interview. First: ${INTERVIEW_OPENER}`;
}

export type ReportDimension = { score: number; comment: string };
export type PracticeTarget = {
  fixIndex: number;
  answerNumber: number;
  dimension: 'grammar' | 'structure' | 'content' | 'wording';
  evidenceQuote: string;
  instruction: string;
  successCriterion: string;
};
export type AnswerPracticeContext = PracticeTarget & {
  kind: 'answer_revision';
  sourceSessionId: string;
  targetId: string;
  interviewRole: InterviewRole;
  sourceQuestionBubble: string;
  originalQuestion: string;
  originalAnswer: string;
  selectedFix: string;
};

export type InterviewReportData = {
  rubricVersion?: string;
  interviewRole?: InterviewRole;
  score: number;
  dimensions: { grammar: ReportDimension; structure: ReportDimension; content: ReportDimension; confidence?: ReportDimension };
  strongestAnswer: { question: string; why: string };
  weakestAnswer: { question: string; why: string };
  topFixes: string[];
  answerUpgrades: { question: string; original: string; upgraded: string }[];
  practiceTarget?: PracticeTarget | null;
};

export type InterviewReportResponse = {
  score: number;
  report: InterviewReportData;
  createdAt: string;
  // Skor mock sebelumnya; null kalau ini interview pertama.
  previousScore: number | null;
  practiceContext?: AnswerPracticeContext | null;
};

// POST = generate (idempoten di server: rapor yang sudah ada dikembalikan
// tanpa panggilan AI kedua). Timeout panjang -- ini panggilan AI.
export async function generateReport(sessionId: string): Promise<InterviewReportResponse> {
  return apiFetch<InterviewReportResponse>(`/api/interviews/${sessionId}/report`, {
    method: 'POST',
    auth: true,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

// Read an existing report/verified target without creating a report or making an AI call.
export async function fetchReport(sessionId: string): Promise<InterviewReportResponse> {
  return apiFetch<InterviewReportResponse>(`/api/interviews/${sessionId}/report`, { auth: true });
}
