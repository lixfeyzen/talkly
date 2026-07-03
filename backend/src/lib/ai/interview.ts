import type { ChatTurn } from "@/lib/ai/conversation";

// Fitur #6 (Interview Readiness): wawancara terstruktur 5 pertanyaan.
// Pertanyaan dari bank TERKURASI (bukan AI ngarang bebas) supaya kualitas
// konsisten; AI hanya memparafrasekan + bereaksi natural.

export const INTERVIEW_ROLES = [
  "Software Engineer",
  "Marketing",
  "Sales",
  "Finance",
  "Designer",
  "General",
] as const;

export type InterviewRole = (typeof INTERVIEW_ROLES)[number];

export const QUESTIONS_PER_INTERVIEW = 5;

const OPENER = "Tell me about yourself and your background.";
const CLOSER = "Why should we hire you for this role?";

// Pool behavioral umum -- dipilih 2 per sesi (deterministik per sessionId).
const BEHAVIORAL_POOL = [
  "Tell me about a challenge you faced at work or school, and how you handled it.",
  "Describe a time you had to work with someone difficult. What did you do?",
  "Tell me about a mistake you made and what you learned from it.",
  "Describe a situation where you had to learn something new quickly.",
  "Tell me about a time you disagreed with a decision. How did you respond?",
];

// 1 pertanyaan spesifik-role per sesi.
const ROLE_POOL: Record<InterviewRole, string[]> = {
  "Software Engineer": [
    "Walk me through a project you built. What technical decisions did you make and why?",
    "How do you approach debugging a problem you have never seen before?",
  ],
  Marketing: [
    "Tell me about a campaign or content you worked on. How did you measure its success?",
    "How would you promote a product to an audience that has never heard of it?",
  ],
  Sales: [
    "Walk me through how you would handle a customer who says the price is too high.",
    "Tell me about a time you convinced someone to say yes. What was your approach?",
  ],
  Finance: [
    "Walk me through how you would analyze whether a project is worth investing in.",
    "Tell me about a time you worked with numbers under a tight deadline.",
  ],
  Designer: [
    "Walk me through one design you are proud of. What problem did it solve?",
    "How do you handle feedback that asks you to change a design you believe in?",
  ],
  General: [
    "What do you know about our company, and why do you want to work here?",
    "Where do you see yourself in three years?",
  ],
};

// Hash kecil deterministik -- pemilihan pertanyaan HARUS stabil antar-giliran
// dalam satu sesi (tiap request rebuild prompt dari sessionId yang sama).
function seedFrom(sessionId: string): number {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getInterviewQuestions(role: InterviewRole, sessionId: string): string[] {
  const seed = seedFrom(sessionId);
  const b1 = seed % BEHAVIORAL_POOL.length;
  const b2 = (b1 + 1 + (seed >> 3) % (BEHAVIORAL_POOL.length - 1)) % BEHAVIORAL_POOL.length;
  const rolePool = ROLE_POOL[role];
  const r = (seed >> 6) % rolePool.length;
  return [OPENER, BEHAVIORAL_POOL[b1], BEHAVIORAL_POOL[b2], rolePool[r], CLOSER];
}

// Jumlah jawaban user = jumlah giliran user di transkrip. Progress interview
// diturunkan dari sini -- tanpa state tambahan di DB.
export function countAnswers(history: ChatTurn[]): number {
  return history.filter((t) => t.role === "user").length;
}

export function isInterviewFinished(history: ChatTurn[]): boolean {
  return countAnswers(history) >= QUESTIONS_PER_INTERVIEW;
}

export function buildInterviewSystemPrompt(
  role: InterviewRole,
  questions: string[],
  answeredCount: number, // jawaban user SEBELUM pesan yang sedang diproses
  nativeLanguage: string | null,
  mistakeCategories: readonly string[],
): string {
  const native = nativeLanguage ?? "English";
  const isLast = answeredCount + 1 >= QUESTIONS_PER_INTERVIEW;
  const parts = [
    `You are a professional but friendly job interviewer conducting a mock interview in English for a ${role} position.`,
    `The interview has exactly ${QUESTIONS_PER_INTERVIEW} questions, in this order: ${questions.map((q, i) => `${i + 1}. ${q}`).join(" ")}`,
    `The candidate has just answered question ${answeredCount + 1}.`,
    isLast
      ? `That was the FINAL question. React briefly to their answer (1 sentence), thank them warmly, and tell them their readiness report is being prepared. Do NOT ask any more questions.`
      : `React briefly and naturally to their answer (1 short sentence, like a real interviewer), then ask question ${answeredCount + 2}, paraphrased naturally in your own words.`,
    `Stay in character as an interviewer for the whole conversation. Do NOT correct, coach, or give feedback on their English during the interview -- a real interviewer would not.`,
    `Silently, in the structured output, detect grammar/vocabulary mistakes in the candidate's LAST answer. If there are none, return an empty mistakes array -- never invent mistakes.`,
    `The "note" field of each mistake: a 1-sentence explanation written in ${native}.`,
    `The mistake category MUST be one of: ${mistakeCategories.join(", ")}.`,
  ];
  return parts.join(" ");
}
