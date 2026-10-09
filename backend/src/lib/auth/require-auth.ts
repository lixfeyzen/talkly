import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/auth/jwt";

export async function getAuthFromRequest(req: Pick<Request, "headers">): Promise<AuthTokenPayload | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length);
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  const [user] = await db.select({ authVersion: users.authVersion }).from(users)
    .where(eq(users.id, payload.userId)).limit(1);
  // Existing versionless tokens are generation zero until that account resets its password.
  return user && user.authVersion === (payload.authVersion ?? 0) ? payload : null;
}
