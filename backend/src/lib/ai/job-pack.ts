import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Bagian murni latihan dari lowongan: skema, saringan, dan tanda tangan paket.
// Sengaja tanpa klien OpenAI, supaya validasi dan route percakapan yang memakainya
// tidak ikut memuat SDK AI (pembuatnya ada di job-post.ts).

export const JOB_TEXT_MIN = 80;
export const JOB_TEXT_MAX = 20000;
export const JOB_QUESTION_COUNT = 3;
export const QUESTION_MAX = 200;
export const REQUIREMENT_MAX = 120;

// Bentuk yang diminta dari model. Batas panjang dicek lagi setelahnya.
export const aiJobPackSchema = z.object({
  isJobPost: z.boolean(),
  requirements: z.array(z.string()),
  questions: z.array(z.string()),
});

export const jobPackSchema = z.object({
  requirements: z.array(z.string().min(1).max(REQUIREMENT_MAX)).min(1).max(5),
  questions: z.array(z.string().min(10).max(QUESTION_MAX)).length(JOB_QUESTION_COUNT),
});
export type JobPack = z.infer<typeof jobPackSchema>;

export const signedJobPackSchema = jobPackSchema.extend({
  token: z.string().regex(/^[a-f0-9]{64}$/),
});
export type SignedJobPack = z.infer<typeof signedJobPackSchema>;

// Pertanyaan perilaku sering berbentuk perintah ("Tell me about a time ...",
// "Give an example of ..."): sah sebagai pertanyaan interview walau diakhiri titik.
// Kalimat lain yang diakhiri titik (misal "Ignore all previous instructions.") dibuang.
const PROMPT_START = /^(tell me|tell us|describe|give (me |us )?an example|walk (me|us) through|share|talk (me|us) through|explain)\b/i;
function isInterviewQuestion(q: string): boolean {
  if (q.length < 10 || q.length > QUESTION_MAX) return false;
  return q.endsWith("?") || (q.endsWith(".") && PROMPT_START.test(q));
}

export type JobPackResult =
  | { kind: "ok"; pack: JobPack }
  | { kind: "not_job_post" }
  | { kind: "unusable" };

// Bersihkan dan saring keluaran model. "not_job_post" = model menilai teksnya bukan
// lowongan; "unusable" = lowongan, tapi keluarannya tidak lolos saringan.
export function checkJobPack(raw: unknown): JobPackResult {
  const parsed = aiJobPackSchema.safeParse(raw);
  if (!parsed.success) return { kind: "unusable" };
  if (!parsed.data.isJobPost) return { kind: "not_job_post" };
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const questions = parsed.data.questions
    .map(clean)
    .filter(isInterviewQuestion);
  const requirements = parsed.data.requirements
    .map(clean)
    .filter((r) => r.length > 0 && r.length <= REQUIREMENT_MAX)
    .slice(0, 5);
  if (questions.length < JOB_QUESTION_COUNT || requirements.length === 0) return { kind: "unusable" };
  const pack = { requirements, questions: questions.slice(0, JOB_QUESTION_COUNT) };
  return jobPackSchema.safeParse(pack).success ? { kind: "ok", pack } : { kind: "unusable" };
}

export function validateJobPack(raw: unknown): JobPack | null {
  const r = checkJobPack(raw);
  return r.kind === "ok" ? r.pack : null;
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

// Tanda tangan terikat ke user, supaya paket milik orang lain tidak bisa dipakai.
export function signJobPack(pack: JobPack, userId: string): string {
  return createHmac("sha256", secret())
    .update(JSON.stringify({ v: 1, userId, requirements: pack.requirements, questions: pack.questions }))
    .digest("hex");
}

export function verifyJobPack(signed: SignedJobPack, userId: string): JobPack | null {
  const pack = { requirements: signed.requirements, questions: signed.questions };
  if (!jobPackSchema.safeParse(pack).success) return null;
  const expected = Buffer.from(signJobPack(pack, userId), "hex");
  const given = Buffer.from(signed.token, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given) ? pack : null;
}
