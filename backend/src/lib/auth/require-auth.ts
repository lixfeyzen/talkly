import { NextRequest } from "next/server";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/auth/jwt";

export function getAuthFromRequest(req: NextRequest): AuthTokenPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length);
  return verifyAuthToken(token);
}
