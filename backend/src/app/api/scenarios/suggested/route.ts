import { NextRequest } from "next/server";
import { getRecentCorrectionStats } from "@/lib/data/recent-corrections";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { suggestScenario } from "@/lib/ai/adaptive-scenario";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Latihan terarah (fitur #3): saran skenario berikutnya berdasarkan kelemahan
// user. User baru tanpa data -> { suggestion: null } (empty-state, bukan error);
// UI menampilkan pilihan skenario standar.
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getRecentCorrectionStats(auth.userId);

    return jsonCors({ suggestion: suggestScenario(stats) });
  } catch (err) {
    console.error("Suggested scenario query failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
