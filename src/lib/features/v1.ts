// Fixed v1 policy; Weekly code/history are retained for a later product decision.
export const WEEKLY_CHALLENGE_ENABLED = false;

export function isWeeklyMode(value: string | string[] | undefined): boolean {
  return value === 'weekly_challenge' || (Array.isArray(value) && value.includes('weekly_challenge'));
}
