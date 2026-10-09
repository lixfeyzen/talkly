import { apiFetch } from '@/lib/api/client';

// Practice history: skor mock lintas-waktu + tren kesalahan 14-hari.

export type ScorePoint = { date: string; score: number; role?: string | null; rubricVersion?: string | null };

export type CategoryTrend = {
  category: string;
  recentCount: number;
  previousCount: number;
  changePct: number | null; // perubahan jumlah catatan, bukan mutu; null = tanpa pembanding
};

export type Trajectory = {
  scores: ScorePoint[];
  trends: CategoryTrend[];
  insight: string;
  comparison?: { role: string; rubricVersion: string } | null;
};

export function fetchTrajectory(): Promise<Trajectory> {
  return apiFetch('/api/trajectory', { auth: true });
}
