import { NextRequest } from "next/server";
import { createUser } from "@/lib/auth/credentials";
import { registerSchema } from "@/lib/validations/auth";
import { signAuthToken } from "@/lib/auth/jwt";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
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
