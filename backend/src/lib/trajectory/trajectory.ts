// Readiness Trajectory: jawaban atas "apakah aku makin siap?" -- skor mock
// interview lintas-waktu + tren kategori kesalahan. Fungsi murni (tanpa
// DB/AI/clock) supaya gampang dites; "sekarang" disuntik dari luar.

export type ScorePoint = { date: string; score: number };

export type CategoryTrend = {
  category: string;
  recentCount: number; // 14 hari terakhir
  previousCount: number; // 14 hari sebelumnya
  // Negatif = membaik (kesalahan berkurang). null = belum ada pembanding
  // (kategori baru muncul di jendela terakhir).
  changePct: number | null;
};

export type Trajectory = {
  scores: ScorePoint[];
  trends: CategoryTrend[];
  insight: string;
};

type ReportRow = { score: number; createdAt: Date };
type MistakeRow = { category: string; createdAt: Date };

const WINDOW_MS = 14 * 86_400_000;

export function buildTrajectory(
  reports: ReportRow[],
  mistakes: MistakeRow[],
  now: Date,
  labelOf: (category: string) => string = (c) => c,
): Trajectory {
  const scores: ScorePoint[] = [...reports]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((r) => ({ date: r.createdAt.toISOString().slice(0, 10), score: r.score }));

  // Hitung kesalahan per kategori di dua jendela 14-hari bersebelahan.
  const recentStart = now.getTime() - WINDOW_MS;
  const prevStart = recentStart - WINDOW_MS;
  const recent = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const m of mistakes) {
    const t = m.createdAt.getTime();
    if (t >= recentStart) {
      recent.set(m.category, (recent.get(m.category) ?? 0) + 1);
    } else if (t >= prevStart) {
      previous.set(m.category, (previous.get(m.category) ?? 0) + 1);
    }
  }

  // Top kategori by total dua jendela (yang relevan buat user sekarang).
  const totals = new Map<string, number>();
  for (const [c, n] of recent) totals.set(c, (totals.get(c) ?? 0) + n);
  for (const [c, n] of previous) totals.set(c, (totals.get(c) ?? 0) + n);
  const trends: CategoryTrend[] = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => {
      const r = recent.get(category) ?? 0;
      const p = previous.get(category) ?? 0;
      return {
        category,
        recentCount: r,
        previousCount: p,
        changePct: p === 0 ? null : Math.round(((r - p) / p) * 100),
      };
    });

  return { scores, trends, insight: buildInsight(scores, trends, labelOf) };
}

// Satu kalimat deterministik: rayakan perbaikan paling nyata; jujur bila
// belum ada data pembanding.
function buildInsight(
  scores: ScorePoint[],
  trends: CategoryTrend[],
  labelOf: (category: string) => string,
): string {
  const bestImproving = trends
    .filter((t) => t.changePct !== null && t.changePct < 0)
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))[0];

  if (scores.length >= 2) {
    const first = scores[0].score;
    const last = scores[scores.length - 1].score;
    const delta = last - first;
    if (delta > 0) {
      return bestImproving
        ? `Readiness up ${delta} points since your first mock. ${labelOf(bestImproving.category)} mistakes are down ${Math.abs(bestImproving.changePct!)}%.`
        : `Readiness up ${delta} points since your first mock interview. Keep going.`;
    }
    if (delta < 0) {
      return `Latest mock scored ${Math.abs(delta)} below your first. One off day doesn't erase progress. Do a targeted practice today.`;
    }
    return `Readiness steady at ${last}. Push through with targeted practice on your weak spots.`;
  }

  if (bestImproving) {
    return `${labelOf(bestImproving.category)} mistakes are down ${Math.abs(bestImproving.changePct!)}% these two weeks. Do a mock interview to lock in a readiness score.`;
  }
  if (scores.length === 1) {
    return `First readiness score: ${scores[0].score}. Do another mock this week to start your trend line.`;
  }
  return "Practice a few sessions and do a mock interview. Your progress graph starts here.";
}
