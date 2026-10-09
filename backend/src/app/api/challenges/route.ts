// GET /api/challenges — daftar semua challenge user.
import { getWeeklyChallenges } from "@/lib/data/weekly-challenges";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { WEEKLY_CHALLENGE_ENABLED, WEEKLY_CHALLENGE_DEFERRED } from "@/lib/features/v1";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload) {
    return jsonCors({ error: "Invalid token" }, { status: 401 });
  }

  if (!WEEKLY_CHALLENGE_ENABLED) {
    return jsonCors(WEEKLY_CHALLENGE_DEFERRED.body, { status: WEEKLY_CHALLENGE_DEFERRED.status });
  }
  const challenges = await getWeeklyChallenges(payload.userId);
  return jsonCors({ challenges });
}
