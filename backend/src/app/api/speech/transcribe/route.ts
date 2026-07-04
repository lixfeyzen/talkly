import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/require-auth";
import { openai } from "@/lib/ai/openai";
import { jsonCors, corsPreflight } from "@/lib/http/cors";

export function OPTIONS() {
  return corsPreflight();
}

// Batas keras: ~60 detik rekaman m4a/webm ≈ < 2 MB. Mencegah upload liar
// yang menguras kuota Whisper (dibayar per menit audio).
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/webm",
  "audio/wav",
]);

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return jsonCors({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return jsonCors({ error: "invalid_input", details: "audio file required" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return jsonCors({ error: "audio_too_large", maxBytes: MAX_AUDIO_BYTES }, { status: 413 });
  }
  // type bisa kosong dari beberapa recorder; tolak hanya bila jelas bukan audio.
  const baseType = (file.type || "").split(";")[0].trim().toLowerCase();
  if (baseType && !ALLOWED_TYPES.has(baseType)) {
    return jsonCors({ error: "unsupported_audio_type", got: baseType }, { status: 415 });
  }

  try {
    const result = await openai.audio.transcriptions.create(
      {
        model: "whisper-1",
        file,
        language: "en", // target latihan = English; mengunci bahasa menaikkan akurasi
      },
      { timeout: 30_000 },
    );
    const text = result.text?.trim() ?? "";
    if (!text) {
      return jsonCors({ error: "empty_transcription" }, { status: 422 });
    }
    return jsonCors({ text });
  } catch (err) {
    console.error("transcribe failed", { userId: auth.userId, err: String(err) });
    return jsonCors({ error: "transcription_failed" }, { status: 502 });
  }
}
