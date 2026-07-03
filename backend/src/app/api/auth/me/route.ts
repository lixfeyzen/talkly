import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);

  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  return jsonCors({ user: { id: auth.userId, email: auth.email } });
}
