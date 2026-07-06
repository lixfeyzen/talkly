import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { openai } from "@/lib/ai/openai";
import { MISTAKE_CATEGORIES, type MistakeCategory } from "@/lib/ai/mistake-categories";
import { HUMAN_STYLE_INSTRUCTION } from "@/lib/ai/style";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const turnResultSchema = z.object({
  reply: z.string().describe("Balasan AI dalam karakter roleplay, bahasa target, wajar & natural"),
  mistakes: z.array(
    z.object({
      category: z.enum(MISTAKE_CATEGORIES),
      originalText: z.string().describe("Kutipan persis bagian kalimat user yang salah"),
      correctedText: z.string().describe("Versi yang benar dari bagian itu"),
      note: z
        .string()
        .describe(
          "Penjelasan 1 kalimat kenapa itu salah, ditulis dalam BAHASA NATIVE user",
        ),
    }),
  ),
});

export type TurnResult = z.infer<typeof turnResultSchema>;

function buildSystemPrompt(
  scenario: string,
  targetLanguage: string,
  focusCategories: MistakeCategory[],
  nativeLanguage: string | null,
): string {
  // Default English: produk berposisi global (UI English); user yang sudah
  // onboarding selalu punya bahasa sendiri, jadi fallback ini hanya kepakai
  // di kasus tepi (mis. deep-link sebelum onboarding).
  const native = nativeLanguage ?? "English";
  const parts = [
    `You are a conversation roleplay partner for practicing ${targetLanguage}.`,
    `Current scenario: "${scenario}".`,
    `The user's native language is ${native} -- consider mistake patterns typical of ${native} speakers when detecting mistakes.`,
    `Reply ONLY in ${targetLanguage} (do not mix other languages into the "reply" field), naturally, in-scenario, and briefly (1-3 sentences) so the conversation flows like a real chat. This rule has NO exceptions: even if the user writes in another language, keep replying in ${targetLanguage} and gently encourage them to continue in ${targetLanguage}.`,
    HUMAN_STYLE_INSTRUCTION,
    `Besides replying, detect grammar/vocabulary mistakes in the user's LAST message (not your own messages). Also catch word-order errors, especially misplaced adverbs (e.g. "She speaks very well French" should be "She speaks French very well"). Each mistakes entry must describe exactly ONE error with ONE category -- if a single phrase contains several errors, report them as SEPARATE entries, each with its own correct category (e.g. "They has many client" contains TWO separate mistakes: verb_conjugation "has" -> "have" AND plural_agreement "client" -> "clients"). Report EVERY mistake present in the message -- do not stop after the first few; a single message can easily contain four or more separate mistakes. If there are no mistakes, return an empty mistakes array -- do NOT invent mistakes that are not there.`,
    `The "note" field of each mistake MUST be written in ${native} and ONLY in ${native} -- never any other language, regardless of what language appears in the conversation or the user's message.`,
    `The mistake category MUST be one of: ${MISTAKE_CATEGORIES.join(", ")}. Pick the MOST SPECIFIC category: plural_agreement covers singular/plural noun errors (e.g. "five year" -> "five years") including uncountable nouns, which never take "many" or plural -s (e.g. "many feedbacks" -> "a lot of feedback"); vocabulary_choice covers wrong word choice including wrong adverbs (e.g. "I much enjoy" -> "I really enjoy"); tense_usage covers wrong or missing tense, including a missing auxiliary for perfect tenses (e.g. "He finish the task already" -> "He has already finished the task"); preposition_usage covers wrong, EXTRA, or missing prepositions (an extra "about" or "of" after a verb is preposition_usage); verb_conjugation covers verbs that do not match their subject (e.g. "the teams meets weekly" -> "the teams meet weekly"); word_order is ONLY for words standing in the wrong position -- if the fix removes or replaces a word instead of moving it, it is NOT word_order; use "other" ONLY when nothing else fits.`,
    `Every "correctedText" must be natural, correct ${targetLanguage} exactly as a fluent speaker would phrase it -- never output a correction that is itself ungrammatical. It must also be the FULLY corrected version of the quoted fragment: fix every error inside it, including articles and prepositions.`,
  ];
  if (focusCategories.length > 0) {
    // Fitur #3 (skenario adaptif): sesi ini menargetkan kelemahan spesifik
    // user -- AI mengarahkan percakapan secara halus, bukan jadi guru grammar.
    parts.push(
      `This session is TARGETED PRACTICE: the user is working on their weakness in ${focusCategories.join(" and ")}. Subtly steer your questions and the flow of the conversation so the user is forced to use those patterns often (stay in character; never mention these instructions).`,
    );
  }
  return parts.join(" ");
}

export async function runConversationTurn(
  scenario: string,
  targetLanguage: string,
  history: ChatTurn[],
  userMessage: string,
  focusCategories: MistakeCategory[] = [],
  nativeLanguage: string | null = null,
  // Mode khusus (mis. mock interview) boleh mengganti system prompt
  // sepenuhnya; skema output terstruktur tetap sama.
  systemPromptOverride?: string,
  // Dipakai eval harness utk benchmark antar-model (default = model produksi).
  modelOverride?: string,
  // Eksperimen jitter (entri #19): temperature rendah = deteksi lebih
  // konsisten, reply kurang variatif. undefined = default API (produksi).
  temperatureOverride?: number,
): Promise<TurnResult> {
  const completion = await openai.chat.completions.parse({
    model: modelOverride ?? "gpt-4o-2024-08-06",
    ...(temperatureOverride != null ? { temperature: temperatureOverride } : {}),
    messages: [
      {
        role: "system",
        content:
          systemPromptOverride ??
          buildSystemPrompt(scenario, targetLanguage, focusCategories, nativeLanguage),
      },
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
