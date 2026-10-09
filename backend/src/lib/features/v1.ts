// Fixed v1 policy; retained Weekly implementation is not enabled by env/client.
export const WEEKLY_CHALLENGE_ENABLED = false;
export const WEEKLY_CHALLENGE_DEFERRED = {
  body: { error: "weekly_challenge_deferred" }, status: 403,
} as const;
