import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await getDashboardData(auth.userId);
    return jsonCors(data);
  } catch (err) {
    console.error("Dashboard query failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
