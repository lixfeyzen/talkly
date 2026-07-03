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
  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    return jsonCors({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = signAuthToken({ userId: result.user.id, email: result.user.email });

  return jsonCors({ token, user: result.user });
}
