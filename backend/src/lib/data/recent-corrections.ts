import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { mistakePatterns } from "@/lib/db/schema";

export const RECENT_CORRECTION_DAYS = 28;

// One recent-focus rule for suggestions, countdown and Dashboard; read-only.
export async function getRecentCorrectionStats(userId: string, asOf = new Date()) {
  const since = new Date(asOf.getTime() - RECENT_CORRECTION_DAYS * 86_400_000);
  return db.select({ category: mistakePatterns.category, occurrenceCount: count() })
    .from(mistakePatterns)
    .where(and(eq(mistakePatterns.userId, userId),
      gte(mistakePatterns.createdAt, since), lte(mistakePatterns.createdAt, asOf)))
    .groupBy(mistakePatterns.category)
    .orderBy(desc(count()), asc(mistakePatterns.category))
    .limit(5);
}
