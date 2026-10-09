// GET /api/challenges/[weekNumber]
import { getChallenge } from "@/lib/data/weekly-challenges";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { WEEKLY_CHALLENGE_ENABLED, WEEKLY_CHALLENGE_DEFERRED } from "@/lib/features/v1";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ weekNumber: string }> },
) {
  const payload = await getAuthFromRequest(req);
  if (!payload) {
    return jsonCors({ error: "Invalid token" }, { status: 401 });
  }

  if (!WEEKLY_CHALLENGE_ENABLED) {
    return jsonCors(WEEKLY_CHALLENGE_DEFERRED.body, { status: WEEKLY_CHALLENGE_DEFERRED.status });
  }
  const { weekNumber } = await params;
  const week = parseInt(weekNumber, 10);
  if (isNaN(week) || week < 1) {
    return jsonCors({ error: "Invalid week number" }, { status: 400 });
  }

  const challenge = await getChallenge(payload.userId, week);
  if (!challenge) {
    return jsonCors({ error: "Challenge not found" }, { status: 404 });
  }

  return jsonCors({ challenge });
}
