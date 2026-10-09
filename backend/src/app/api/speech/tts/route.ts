import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { openai } from "@/lib/ai/openai";
import { jsonCors, corsPreflight, CORS_HEADERS } from "@/lib/http/cors";
import { consumeQuota } from "@/lib/rate-limit";

export function OPTIONS() {
  return corsPreflight();
}

// Balasan AI di chat pendek (2-4 kalimat). 1000 char = pagar biaya TTS
// (tts-1 dibayar per karakter), bukan batas fungsional.
const ttsSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  // Pagar biaya AI (wallet attack): satu bucket "ai" bersama per-user.
  const quota = await consumeQuota(auth.userId, "ai");
  if (!quota.allowed) {
    return jsonCors(
      { error: "rate_limited", retryAfterSec: quota.retryAfterSec },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = ttsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonCors(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const speech = await openai.audio.speech.create(
      {
        model: "tts-1",
        voice: "alloy",
        input: parsed.data.text,
        response_format: "mp3",
      },
      { timeout: 30_000 },
    );
    const buf = Buffer.from(await speech.arrayBuffer());
    return new Response(buf, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/mpeg",
        // Teks sama -> audio sama; boleh di-cache client agar replay gratis.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("tts failed", { userId: auth.userId, err: String(err) });
    return jsonCors({ error: "tts_failed" }, { status: 502 });
  }
}
