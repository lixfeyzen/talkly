import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userMistakeStats } from "@/lib/db/schema";
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
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const stats = await db
      .select({
        category: userMistakeStats.category,
        occurrenceCount: userMistakeStats.occurrenceCount,
      })
      .from(userMistakeStats)
      .where(eq(userMistakeStats.userId, auth.userId))
      .orderBy(desc(userMistakeStats.occurrenceCount))
      .limit(5);

    return jsonCors({ suggestion: suggestScenario(stats) });
  } catch (err) {
    console.error("Suggested scenario query failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
