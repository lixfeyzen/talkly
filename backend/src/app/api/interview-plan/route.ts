import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getRecentCorrectionStats } from "@/lib/data/recent-corrections";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { INTERVIEW_ROLES, type InterviewRole } from "@/lib/ai/interview";
import { buildPlan, daysUntil } from "@/lib/interview-plan/plan";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Interview-Day Countdown: user set tanggal interview nyata + role ->
// dashboard menampilkan hitung mundur + tugas hari ini (deterministik, tanpa AI).

const setPlanSchema = z.object({
  // Date-only ISO + valid kalender. Date.parse menolak bulan/hari ngaco
  // ("2026-13-01" -> NaN) -- tanpa ini Postgres yang meledak (500, bukan 400).
  interviewDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => !Number.isNaN(Date.parse(s)), "invalid calendar date"),
  role: z.enum(INTERVIEW_ROLES),
});

// "Hari ini" versi date-only UTC -- konsisten dgn penyimpanan kolom date.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [user] = await db
      .select({ interviewDate: users.interviewDate, role: users.interviewPlanRole })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    if (!user?.interviewDate || !user.role) {
      return jsonCors({ set: false });
    }

    const asOf = new Date();
    const stats = await getRecentCorrectionStats(auth.userId, asOf);
    const plan = buildPlan(user.interviewDate, asOf.toISOString().slice(0, 10), user.role as InterviewRole, stats);
    if ("expired" in plan) {
      return jsonCors({ set: true, expired: true, interviewDate: user.interviewDate, role: user.role });
    }
    return jsonCors({
      set: true,
      expired: false,
      interviewDate: user.interviewDate,
      role: user.role,
      ...plan,
    });
  } catch (err) {
    console.error("Interview plan query failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = setPlanSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const daysLeft = daysUntil(parsed.data.interviewDate, todayIso());
  if (!Number.isFinite(daysLeft) || daysLeft < 0) {
    return jsonCors({ error: "date_in_past" }, { status: 400 });
  }
  // Pagar wajar: >90 hari kemungkinan salah ketik tahun.
  if (daysLeft > 90) {
    return jsonCors({ error: "date_too_far", maxDays: 90 }, { status: 400 });
  }

  try {
    await db
      .update(users)
      .set({ interviewDate: parsed.data.interviewDate, interviewPlanRole: parsed.data.role })
      .where(eq(users.id, auth.userId));
    return jsonCors({ ok: true, interviewDate: parsed.data.interviewDate, role: parsed.data.role, daysLeft });
  } catch (err) {
    console.error("Interview plan update failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await db
      .update(users)
      .set({ interviewDate: null, interviewPlanRole: null })
      .where(eq(users.id, auth.userId));
    return jsonCors({ ok: true });
  } catch (err) {
    console.error("Interview plan clear failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
