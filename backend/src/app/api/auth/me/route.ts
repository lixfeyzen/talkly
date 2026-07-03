import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);

  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: { id: auth.userId, email: auth.email } });
}
