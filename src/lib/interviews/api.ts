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

export type ReportDimension = { score: number; comment: string };

export type InterviewReportData = {
  score: number;
  dimensions: { grammar: ReportDimension; structure: ReportDimension; content: ReportDimension };
  strongestAnswer: { question: string; why: string };
  weakestAnswer: { question: string; why: string };
  topFixes: string[];
  answerUpgrades: { question: string; original: string; upgraded: string }[];
};

export type InterviewReportResponse = {
  score: number;
  report: InterviewReportData;
  createdAt: string;
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
