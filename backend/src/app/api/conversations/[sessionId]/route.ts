import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { getSessionForUser } from "@/lib/data/conversations";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Detail satu sesi (transkrip penuh) untuk layar riwayat. Murni baca DB,
// tanpa AI. Kepemilikan dicek di query (sessionId + userId).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return jsonCors({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const session = await getSessionForUser(sessionId, auth.userId);
    if (!session) {
      return jsonCors({ error: "not_found" }, { status: 404 });
    }
    return jsonCors({
      session: {
        id: session.id,
        scenario: session.scenario,
        mode: session.mode,
        interviewRole: session.interviewRole,
        createdAt: session.createdAt,
        transcript: session.transcript,
      },
    });
  } catch (err) {
    console.error("Get session failed:", err);
    return jsonCors({ error: "internal_error" }, { status: 500 });
  }
}
