import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { consumeQuota } from "@/lib/rate-limit";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { generateJobPack, jobPostInputSchema, signJobPack } from "@/lib/ai/job-post";

export function OPTIONS() {
  return corsPreflight();
}

// Buat 3 pertanyaan mock interview dari lowongan yang ditempel. Hasil
// ditandatangani untuk dipakai di giliran pertama /api/conversations.
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonCors({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = jobPostInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Panggilan AI berbayar: bucket kuota yang sama dengan percakapan.
  const quota = await consumeQuota(auth.userId, "ai");
  if (!quota.allowed) {
    return jsonCors({ error: "rate_limited", retryAfterSec: quota.retryAfterSec }, { status: 429 });
  }

  let result;
  try {
    result = await generateJobPack(parsed.data.jobText, parsed.data.role);
  } catch {
    // Jangan log teks lowongan (bisa berisi data pribadi).
    console.error("Job post AI request failed");
    return jsonCors({ error: "ai_service_unavailable" }, { status: 502 });
  }
  if (result.kind === "not_job_post") return jsonCors({ error: "not_a_job_post" }, { status: 422 });
  if (result.kind === "unusable") {
    console.error("Job post AI output failed validation twice");
    return jsonCors({ error: "ai_service_unavailable" }, { status: 502 });
  }

  return jsonCors({ ...result.pack, token: signJobPack(result.pack, auth.userId) });
}
