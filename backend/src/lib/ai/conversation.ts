import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "@/lib/ai/openai";
import { MISTAKE_CATEGORIES } from "@/lib/ai/mistake-categories";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const turnResultSchema = z.object({
  reply: z.string().describe("Balasan AI dalam karakter roleplay, bahasa target, wajar & natural"),
  mistakes: z.array(
    z.object({
      category: z.enum(MISTAKE_CATEGORIES),
      originalText: z.string().describe("Kutipan persis bagian kalimat user yang salah"),
      correctedText: z.string().describe("Versi yang benar dari bagian itu"),
    }),
  ),
});

export type TurnResult = z.infer<typeof turnResultSchema>;

function buildSystemPrompt(scenario: string, targetLanguage: string): string {
  return [
    `Kamu berperan sebagai partner roleplay percakapan buat latihan bahasa ${targetLanguage}.`,
    `Skenario saat ini: "${scenario}".`,
    `Balas HANYA dalam ${targetLanguage} (jangan campur bahasa lain di field "reply"), natural, sesuai skenario, singkat (1-3 kalimat) biar percakapan tetap mengalir seperti obrolan nyata.`,
    `Selain balasan, deteksi kesalahan grammar/vocab pada pesan TERAKHIR user (bukan pesan kamu sendiri). Kalau tidak ada kesalahan, kembalikan array mistakes kosong -- JANGAN mengarang kesalahan yang tidak ada.`,
    `Kategori kesalahan HARUS salah satu dari: ${MISTAKE_CATEGORIES.join(", ")}.`,
  ].join(" ");
}

export async function runConversationTurn(
  scenario: string,
  targetLanguage: string,
  history: ChatTurn[],
  userMessage: string,
): Promise<TurnResult> {
  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: buildSystemPrompt(scenario, targetLanguage) },
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user", content: userMessage },
    ],
    response_format: zodResponseFormat(turnResultSchema, "turn_result"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("OpenAI did not return a parsed structured response");
  }

  return parsed;
}
