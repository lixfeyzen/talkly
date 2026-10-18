import { apiFetch } from '@/lib/api/client';
import type { InterviewRole } from '@/lib/interviews/api';
import { localIsoDate } from '@/lib/dates';

// Interview-Day Countdown: rencana persiapan mundur dari tanggal interview nyata.

export type PlanTask = {
  type: 'practice' | 'mock' | 'review' | 'interview_day';
  title: string;
  description: string;
  scenario?: string;
  focusCategories?: string[];
};

export type InterviewPlanResponse =
  | { set: false }
  | { set: true; expired: true; interviewDate: string; role: InterviewRole }
  | {
      set: true;
      expired: false;
      interviewDate: string;
      role: InterviewRole;
      daysLeft: number;
      todayTask: PlanTask;
    };

export function fetchInterviewPlan(): Promise<InterviewPlanResponse> {
  // Kirim tanggal lokal supaya server menghitung sisa hari dari "hari ini" pengguna.
  return apiFetch(`/api/interview-plan?today=${localIsoDate()}`, { auth: true });
}

export function setInterviewPlan(
  interviewDate: string,
  role: InterviewRole,
): Promise<{ ok: true; daysLeft: number }> {
  return apiFetch('/api/interview-plan', {
    method: 'POST',
    auth: true,
    body: { interviewDate, role, today: localIsoDate() },
  });
}

export function clearInterviewPlan(): Promise<{ ok: true }> {
  return apiFetch('/api/interview-plan', { method: 'DELETE', auth: true });
}
