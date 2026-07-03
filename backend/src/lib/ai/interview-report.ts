import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "@/lib/ai/openai";
import type { ChatTurn } from "@/lib/ai/conversation";
import type { InterviewRole } from "@/lib/ai/interview";

// Rapor kesiapan interview (fitur #6). Bentuk dijaga zod -- yang tersimpan
// di kolom jsonb selalu valid terhadap skema ini.

const dimensionSchema = z.object({
  score: z.number().min(0).max(100),
  comment: z.string().describe("1-2 kalimat, dalam bahasa native user"),
});

export const interviewReportSchema = z.object({
  score: z.number().min(0).max(100).describe("Skor kesiapan keseluruhan"),
  dimensions: z.object({
    grammar: dimensionSchema,
    structure: dimensionSchema.describe("Kejelasan & struktur jawaban (mis. STAR)"),
    content: dimensionSchema.describe("Kekuatan isi/substansi jawaban"),
  }),
  strongestAnswer: z.object({
    question: z.string(),
    why: z.string().describe("Kenapa ini jawaban terkuat, dalam bahasa native user"),
  }),
  weakestAnswer: z.object({
    question: z.string(),
    why: z.string().describe("Kenapa ini jawaban terlemah, dalam bahasa native user"),
  }),
  topFixes: z
    .array(z.string().describe("Perbaikan prioritas, dalam bahasa native user"))
    .min(1)
    .max(3),
  answerUpgrades: z
    .array(
      z.object({
        question: z.string(),
        original: z.string().describe("Ringkasan jawaban asli kandidat"),
        upgraded: z.string().describe("Versi jawaban yang lebih kuat, dalam ENGLISH, struktur STAR bila cocok"),
      }),
    )
    .min(1)
    .max(2),
});

export type InterviewReport = z.infer<typeof interviewReportSchema>;

export async function generateInterviewReport(
  role: InterviewRole,
  transcript: ChatTurn[],
  nativeLanguage: string | null,
): Promise<InterviewReport> {
  const native = nativeLanguage ?? "English";
  const system = [
    `You are an experienced hiring coach. Assess a mock English job interview for a ${role} position.`,
    `Score honestly: a beginner rambling answer is not an 80. Score reflects readiness for a REAL interview.`,
    `All comments, "why" fields, and topFixes must be written in ${native}.`,
    `"upgraded" answers must be written in ENGLISH, concrete and natural (use the STAR structure where it fits), based on what the candidate actually said -- do not invent a different person.`,
    `Pick the strongest and weakest answers from the actual questions asked.`,
  ].join(" ");

  const conversationText = transcript
    .map((t) => `${t.role === "user" ? "CANDIDATE" : "INTERVIEWER"}: ${t.content}`)
    .join("\n");

  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Here is the full interview transcript:\n\n${conversationText}` },
    ],
    response_format: zodResponseFormat(interviewReportSchema, "interview_report"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("OpenAI did not return a parsed interview report");
  }
  return parsed;
}
