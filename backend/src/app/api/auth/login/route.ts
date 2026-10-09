import { createHmac } from "node:crypto";
import { consumeQuota, clientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { verifyCredentials } from "@/lib/auth/credentials";
import { loginSchema } from "@/lib/validations/auth";
import { signAuthToken } from "@/lib/auth/jwt";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonCors(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  // Store a keyed digest, not the email address, in the shared quota table.
  const accountKey = createHmac("sha256", process.env.JWT_SECRET!).update(email).digest("hex");
  for (const [subject, action] of [
    [`ip:${clientIp(req.headers)}`, "loginIp"], [`account:${accountKey}`, "loginAccount"],
  ] as const) {
    const quota = await consumeQuota(subject, action);
    if (!quota.allowed) return jsonCors({ error: "rate_limited", retryAfterSec: quota.retryAfterSec }, { status: 429 });
  }
  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    return jsonCors({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = signAuthToken({ userId: result.user.id, email: result.user.email, authVersion: result.user.authVersion });

  return jsonCors({ token, user: result.user });
}
