import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { TurnResult } from "@/lib/ai/conversation";
import type { StreakData } from "@/lib/data/streaks";
import type { AnswerPracticeContext } from "@/lib/practice/interview-target";
import type { FrozenTaskSelection, TransferContext } from "@/lib/practice/criterion-transfer";
import type { JobPack } from "@/lib/ai/job-post";

export type TurnResponse = TurnResult & {
  sessionId: string;
  streak?: StreakData;
  interview?: { questionNumber: number; total: number; finished: boolean };
  practiceContext?: AnswerPracticeContext;
  transferContext?: TransferContext;
  transferSelection?: FrozenTaskSelection | null;
  transferReason?: string;
};
export type PreparedTurn = {
  message: string;
  openingMessage?: string;
  practiceContext?: AnswerPracticeContext;
  transferContext?: TransferContext;
  jobPack?: JobPack;
  expectedTurns: number;
  createdAt: string;
  response: TurnResponse;
};
export type TurnRequest = {
  userId: string;
  requestId: string;
  payloadHash: string;
  sessionId: string | null;
  leaseToken: string;
  leaseExpiresAt: Date;
  result: PreparedTurn | null;
  response: TurnResponse | null;
};
export class TurnConflict extends Error {
  constructor(public code: "request_in_progress" | "request_id_reused" | "session_changed") {
    super(code);
  }
}

export async function readTurnRequest(userId: string, requestId: string): Promise<TurnRequest | null> {
  const result = await db.execute(sql`
    SELECT user_id AS "userId", request_id AS "requestId", payload_hash AS "payloadHash",
      session_id AS "sessionId", lease_token AS "leaseToken", lease_expires_at AS "leaseExpiresAt",
      result, response
    FROM conversation_turn_requests WHERE user_id = ${userId} AND request_id = ${requestId}
  `);
  return (result.rows[0] as TurnRequest | undefined) ?? null;
}

// A lease prevents simultaneous retries from making parallel paid calls.
// A saved AI result survives a subsequent transaction failure and can be committed on retry.
export async function claimTurnRequest(
  userId: string, requestId: string, payloadHash: string, sessionId: string | null,
): Promise<TurnRequest> {
  const token = randomUUID();
  const claimed = await db.execute(sql`
    INSERT INTO conversation_turn_requests (user_id, request_id, payload_hash, session_id, lease_token, lease_expires_at)
    VALUES (${userId}, ${requestId}, ${payloadHash}, ${sessionId}, ${token}, now() + interval '2 minutes')
    ON CONFLICT (user_id, request_id) DO UPDATE
      SET lease_token = EXCLUDED.lease_token, lease_expires_at = EXCLUDED.lease_expires_at
      WHERE conversation_turn_requests.payload_hash = EXCLUDED.payload_hash
        AND conversation_turn_requests.response IS NULL AND conversation_turn_requests.result IS NULL
        AND conversation_turn_requests.lease_expires_at <= now()
    RETURNING request_id
  `);
  const row = await readTurnRequest(userId, requestId);
  if (!row) throw Error("Request could not be reserved");
  if (row.payloadHash !== payloadHash) throw new TurnConflict("request_id_reused");
  if (!claimed.rows.length && !row.result && !row.response) throw new TurnConflict("request_in_progress");
  return row;
}

export async function releaseTurnRequest(request: TurnRequest) {
  await db.execute(sql`
    UPDATE conversation_turn_requests SET lease_expires_at = now()
    WHERE user_id = ${request.userId} AND request_id = ${request.requestId}
      AND lease_token = ${request.leaseToken} AND result IS NULL AND response IS NULL
  `);
}

// Session creation and attachment are one statement, so retries cannot create orphan sessions.
export async function ensureTurnSession(request: TurnRequest, options: {
  scenario: string; targetLanguage: string; focusCategories: string[];
  mode: string; interviewRole: string | null;
}): Promise<string> {
  if (request.sessionId) return request.sessionId;
  const result = await db.execute(sql`
    WITH owned AS (
      SELECT user_id, request_id FROM conversation_turn_requests
      WHERE user_id = ${request.userId} AND request_id = ${request.requestId}
        AND lease_token = ${request.leaseToken} AND session_id IS NULL FOR UPDATE
    ), created AS (
      INSERT INTO conversation_sessions (user_id, scenario, target_language, focus_categories, mode, interview_role)
      SELECT user_id, ${options.scenario}, ${options.targetLanguage}, ${JSON.stringify(options.focusCategories)}::jsonb,
        ${options.mode}, ${options.interviewRole} FROM owned RETURNING id
    )
    UPDATE conversation_turn_requests SET session_id = created.id FROM created
    WHERE user_id = ${request.userId} AND request_id = ${request.requestId}
    RETURNING session_id AS "sessionId"
  `);
  const id = result.rows[0]?.sessionId as string | undefined;
  if (!id) throw new TurnConflict("request_in_progress");
  return id;
}

export async function prepareTurnResult(request: TurnRequest, result: PreparedTurn) {
  const saved = await db.execute(sql`
    UPDATE conversation_turn_requests SET result = ${JSON.stringify(result)}::jsonb
    WHERE user_id = ${request.userId} AND request_id = ${request.requestId}
      AND lease_token = ${request.leaseToken} AND result IS NULL AND response IS NULL
    RETURNING request_id
  `);
  if (!saved.rows.length) throw new TurnConflict("request_in_progress");
}

export async function completeTurnRequest(userId: string, requestId: string): Promise<TurnResponse> {
  const request = await readTurnRequest(userId, requestId);
  if (request?.response) return request.response;
  if (!request?.result || !request.sessionId) throw new TurnConflict("request_in_progress");
  const prepared = request.result;
  const turns = [
    ...(prepared.expectedTurns === 0 && prepared.openingMessage
      ? [{ role: "assistant", content: prepared.openingMessage, requestId, createdAt: prepared.createdAt,
          ...(prepared.practiceContext ? { practiceContext: prepared.practiceContext } : {}),
          ...(prepared.transferContext ? { transferContext: prepared.transferContext } : {}),
          ...(prepared.jobPack ? { jobPack: prepared.jobPack } : {}) }]
      : []),
    { role: "user", content: prepared.message, mistakes: prepared.response.mistakes, requestId, createdAt: prepared.createdAt,
      ...(prepared.response.feedbackGuidanceVersion !== undefined ? { feedbackGuidanceVersion: prepared.response.feedbackGuidanceVersion } : {}) },
    { role: "assistant", content: prepared.response.reply, requestId, createdAt: prepared.createdAt,
      ...(prepared.response.feedbackGuidanceVersion !== undefined ? { feedbackGuidanceVersion: prepared.response.feedbackGuidanceVersion } : {}),
      ...(prepared.response.transferSelection !== undefined ? { transferSelection: prepared.response.transferSelection, transferReason: prepared.response.transferReason } : {}),
      ...(prepared.response.criterionCheck ? { criterionCheck: prepared.response.criterionCheck } : {}) },
  ];
  const today = prepared.createdAt.slice(0, 10);
  // Every write depends on saved. A duplicate or stale turn cannot modify corrections/stats/streak.
  // PostgreSQL rolls back the entire statement if any write fails.
  const result = await db.execute(sql`
    WITH owned AS (
      SELECT user_id, request_id, session_id FROM conversation_turn_requests
      WHERE user_id = ${userId} AND request_id = ${requestId} AND result IS NOT NULL AND response IS NULL
      FOR UPDATE
    ), saved AS (
      UPDATE conversation_sessions s SET transcript = s.transcript || ${JSON.stringify(turns)}::jsonb
      FROM owned o WHERE s.id = o.session_id AND s.user_id = o.user_id
        AND jsonb_array_length(s.transcript) = ${prepared.expectedTurns}
      RETURNING s.id
    ), corrections AS (
      INSERT INTO mistake_patterns (user_id, session_id, category, original_text, corrected_text, note)
      SELECT ${userId}, saved.id, m.category, m."originalText", m."correctedText", m.note
      FROM saved CROSS JOIN jsonb_to_recordset(${JSON.stringify(prepared.response.mistakes)}::jsonb)
        AS m(category text, "originalText" text, "correctedText" text, note text)
      RETURNING category
    ), stats AS (
      INSERT INTO user_mistake_stats (user_id, category, occurrence_count)
      SELECT ${userId}, category, count(*)::int FROM corrections GROUP BY category
      ON CONFLICT (user_id, category) DO UPDATE SET
        occurrence_count = user_mistake_stats.occurrence_count + EXCLUDED.occurrence_count,
        last_seen_at = now()
      RETURNING category
    ), streak AS (
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_practice_date)
      SELECT ${userId}, 1, 1, ${today}::date FROM saved
      ON CONFLICT (user_id) DO UPDATE SET
        current_streak = CASE
          WHEN user_streaks.last_practice_date >= EXCLUDED.last_practice_date THEN user_streaks.current_streak
          WHEN user_streaks.last_practice_date = EXCLUDED.last_practice_date - 1 THEN user_streaks.current_streak + 1
          ELSE 1 END,
        longest_streak = greatest(user_streaks.longest_streak, CASE
          WHEN user_streaks.last_practice_date >= EXCLUDED.last_practice_date THEN user_streaks.current_streak
          WHEN user_streaks.last_practice_date = EXCLUDED.last_practice_date - 1 THEN user_streaks.current_streak + 1
          ELSE 1 END),
        last_practice_date = greatest(user_streaks.last_practice_date, EXCLUDED.last_practice_date)
      RETURNING current_streak, longest_streak, last_practice_date
    )
    UPDATE conversation_turn_requests r SET response = ${JSON.stringify(prepared.response)}::jsonb ||
      jsonb_build_object('streak', jsonb_build_object(
        'currentStreak', streak.current_streak, 'longestStreak', streak.longest_streak,
        'lastPracticeDate', streak.last_practice_date))
    FROM owned, saved, streak
    WHERE r.user_id = owned.user_id AND r.request_id = owned.request_id
    RETURNING response
  `);
  if (result.rows[0]) return result.rows[0].response as TurnResponse;
  // A concurrent identical retry may have committed while this statement waited for the lock.
  const completed = await readTurnRequest(userId, requestId);
  if (completed?.response) return completed.response;
  throw new TurnConflict("session_changed");
}
