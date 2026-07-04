import type { WeaknessStat } from "@/lib/ai/adaptive-scenario";
import { suggestScenario } from "@/lib/ai/adaptive-scenario";
import type { InterviewRole } from "@/lib/ai/interview";

// Interview-Day Countdown: rencana persiapan deterministik mundur dari hari-H.
// Fungsi murni (tanpa DB/AI/clock) supaya gampang dites -- tanggal "hari ini"
// disuntik dari luar.

export type PlanTask = {
  // Dipakai UI untuk deep-link: practice -> layar conversation (dgn skenario/
  // fokus), mock -> mock interview, review -> daftar kelemahan di dashboard,
  // interview_day -> pesan hari-H (tanpa latihan berat).
  type: "practice" | "mock" | "review" | "interview_day";
  title: string;
  description: string;
  scenario?: string;
  focusCategories?: string[];
};

export type InterviewPlan = {
  daysLeft: number;
  todayTask: PlanTask;
};

// Selisih hari kalender dari string date ISO (YYYY-MM-DD). Dihitung di UTC
// murni dari komponen tanggal -- bebas dari jam & timezone server.
export function daysUntil(interviewDate: string, today: string): number {
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = interviewDate.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function buildPlan(
  interviewDate: string,
  today: string,
  role: InterviewRole,
  weaknesses: WeaknessStat[],
): InterviewPlan | { expired: true } {
  const daysLeft = daysUntil(interviewDate, today);
  if (daysLeft < 0) {
    // Tanggal lewat: jangan pura-pura masih ada rencana. UI menawarkan
    // set tanggal baru / hapus.
    return { expired: true };
  }

  if (daysLeft === 0) {
    return {
      daysLeft,
      todayTask: {
        type: "interview_day",
        title: "Interview day. You've got this!",
        description:
          "No heavy practice today. Skim your tracked mistakes once, breathe, and speak a little slower than feels natural.",
      },
    };
  }

  if (daysLeft === 1) {
    return {
      daysLeft,
      todayTask: {
        type: "review",
        title: "Final review",
        description:
          "Light day: review your most frequent mistakes and do one short warm-up answer. No new material the day before.",
        focusCategories: weaknesses.slice(0, 3).map((w) => w.category),
      },
    };
  }

  // H-2 dan H-3: full mock interview -> rapor kesiapan terbaru.
  if (daysLeft <= 3) {
    return {
      daysLeft,
      todayTask: {
        type: "mock",
        title: `Full mock interview: ${role}`,
        description: `${daysLeft} days out: do a complete 5-question mock and read your readiness report.`,
      },
    };
  }

  // Lebih dari 3 hari: latihan terarah ke kelemahan (mesin adaptif yang ada).
  const suggestion = suggestScenario(weaknesses);
  return {
    daysLeft,
    todayTask: {
      type: "practice",
      title: "Targeted practice",
      description: suggestion
        ? suggestion.reason
        : "Build session history first. Every conversation teaches the app your weak spots.",
      scenario: suggestion?.scenario ?? "Tell me about yourself",
      focusCategories: suggestion?.focusCategories,
    },
  };
}
