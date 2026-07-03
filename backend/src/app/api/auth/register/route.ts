import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth/credentials";
import { registerSchema } from "@/lib/validations/auth";
import { signAuthToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const result = await createUser(email, password);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  const token = signAuthToken({ userId: result.user.id, email: result.user.email });

  return NextResponse.json(
    { token, user: { id: result.user.id, email: result.user.email } },
    { status: 201 },
  );
}
