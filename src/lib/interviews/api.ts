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

// Latihan dari lowongan: server mengubah teks lowongan jadi 3 pertanyaan +
// kebutuhan utama, ditandatangani supaya tidak bisa diubah di klien.
export const JOB_TEXT_MIN = 80;
export const JOB_TEXT_MAX = 6000;

export type JobPack = { requirements: string[]; questions: string[]; token: string };

export async function createJobPack(jobText: string, role: InterviewRole): Promise<JobPack> {
  return apiFetch<JobPack>('/api/interview-job', {
    method: 'POST',
    auth: true,
    body: { jobText, role },
    timeoutMs: AI_TIMEOUT_MS,
  });
}

// Paket dibawa dari layar lowongan ke layar percakapan lewat memori, bukan URL
// (terlalu panjang dan tidak perlu terlihat). Hilang kalau halaman dimuat ulang.
let pendingJobPack: { role: InterviewRole; pack: JobPack } | null = null;
export function setPendingJobPack(role: InterviewRole, pack: JobPack) {
  pendingJobPack = { role, pack };
}
export function peekPendingJobPack(role: InterviewRole): JobPack | null {
  return pendingJobPack && pendingJobPack.role === role ? pendingJobPack.pack : null;
}
