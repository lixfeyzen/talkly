import { NextRequest } from "next/server";
import { createUser } from "@/lib/auth/credentials";
import { registerSchema } from "@/lib/validations/auth";
import { signAuthToken } from "@/lib/auth/jwt";
import { jsonCors, corsPreflight } from "@/lib/http/cors";
import { consumeQuota, clientIp } from "@/lib/rate-limit";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  // Anti pabrik-akun: registrasi dibatasi per-IP (5/menit, 20/hari).
  const quota = await consumeQuota(`ip:${clientIp(req.headers)}`, "register");
  if (!quota.allowed) {
    return jsonCors(
      { error: "rate_limited", retryAfterSec: quota.retryAfterSec },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonCors(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const result = await createUser(email, password);

  if (!result.ok) {
    return jsonCors({ error: result.reason }, { status: 409 });
  }

  const token = signAuthToken({ userId: result.user.id, email: result.user.email });

  return jsonCors(
    { token, user: { id: result.user.id, email: result.user.email } },
    { status: 201 },
  );
}
