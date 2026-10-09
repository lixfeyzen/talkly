// Practice scores and recorded correction counts. Counts measure activity,
// not proficiency; the clock is supplied so window boundaries can be tested.

export type ScorePoint = { date: string; score: number; role?: string | null; rubricVersion?: string | null };

export type CategoryTrend = {
  category: string;
  recentCount: number; // 14 hari terakhir
  previousCount: number; // 14 hari sebelumnya
  // Percentage change in recorded counts, not an error rate or learning gain.
  // null means there is no prior count to divide by.
  changePct: number | null;
};

export type Trajectory = {
  scores: ScorePoint[];
  trends: CategoryTrend[];
  insight: string;
  comparison: { role: string; rubricVersion: string } | null;
};

type ReportRow = { score: number; createdAt: Date; role?: string | null; rubricVersion?: string | null };
type MistakeRow = { category: string; createdAt: Date };

const WINDOW_MS = 14 * 86_400_000;

export function buildTrajectory(
  reports: ReportRow[],
  mistakes: MistakeRow[],
  now: Date,
  labelOf: (category: string) => string = (c) => c,
): Trajectory {
  const ordered = reports.filter(r => r.createdAt.getTime() <= now.getTime())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  // Shared role/rubric does not establish equivalent questions or learning.
  const comparison = null;
  const scores: ScorePoint[] = ordered.map(r => ({
    date: r.createdAt.toISOString().slice(0, 10), score: r.score, role: r.role ?? null, rubricVersion: r.rubricVersion ?? null,
  }));

  // Hitung kesalahan per kategori di dua jendela 14-hari bersebelahan.
  const recentStart = now.getTime() - WINDOW_MS;
  const prevStart = recentStart - WINDOW_MS;
  const recent = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const m of mistakes) {
    const t = m.createdAt.getTime();
    if (t > now.getTime()) continue;
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

  return { scores, trends, comparison, insight: buildInsight(scores, trends, labelOf) };
}

// Report observed differences without diagnosing learning from activity.
function buildInsight(
  scores: ScorePoint[],
  trends: CategoryTrend[],
  labelOf: (category: string) => string,
): string {
  const parts: string[] = [];
  if (scores.length > 0) {
    parts.push(`Latest report score: ${scores[scores.length - 1].score}. Scores describe individual practice reports; different tasks or scoring instructions are not established as equivalent. They do not establish learning.`);
  }
  const top = trends[0];
  if (top) {
    parts.push(`Recorded ${labelOf(top.category)} corrections: ${top.recentCount} in the last 14 days, versus ${top.previousCount} in the previous 14. Counts vary with practice volume and cannot establish improvement.`);
  }
  return parts.join(" ") || "Do a mock interview to record practice feedback. Your practice graph starts here.";
}
