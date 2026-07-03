import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { getDashboardData } from "@/lib/data/dashboard";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await getDashboardData(auth.userId);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Dashboard query failed:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
