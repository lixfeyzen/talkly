import { getChallengeProgress } from "@/lib/data/weekly-challenges";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { jsonCors } from "@/lib/http/cors";
import { WEEKLY_CHALLENGE_ENABLED, WEEKLY_CHALLENGE_DEFERRED } from "@/lib/features/v1";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload) {
    return jsonCors({ error: "Invalid token" }, { status: 401 });
  }

  if (!WEEKLY_CHALLENGE_ENABLED) {
    return jsonCors(WEEKLY_CHALLENGE_DEFERRED.body, { status: WEEKLY_CHALLENGE_DEFERRED.status });
  }
  const progress = await getChallengeProgress(payload.userId);
  return jsonCors({ progress });
}

export function OPTIONS() {
  return jsonCors(null, { status: 204 });
}
