import { apiFetch } from '@/lib/api/client';

// Readiness Trajectory: skor mock lintas-waktu + tren kesalahan 14-hari.

export type ScorePoint = { date: string; score: number };

export type CategoryTrend = {
  category: string;
  recentCount: number;
  previousCount: number;
  changePct: number | null; // negatif = membaik; null = belum ada pembanding
};

export type Trajectory = {
  scores: ScorePoint[];
  trends: CategoryTrend[];
  insight: string;
};

export function fetchTrajectory(): Promise<Trajectory> {
  return apiFetch('/api/trajectory', { auth: true });
}
