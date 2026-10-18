import { z } from "zod";
import { MISTAKE_CATEGORIES } from "@/lib/ai/mistake-categories";
import { INTERVIEW_ROLES } from "@/lib/ai/interview";
import { signedJobPackSchema } from "@/lib/ai/job-post";

export const sendMessageSchema = z
  .object({
    requestId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    scenario: z.string().trim().min(1).max(200).optional(),
    targetLanguage: z.string().trim().min(1).max(50).optional(),
    // Latihan terarah (fitur #3): hanya dipakai saat MEMBUAT sesi baru --
    // sesi lanjutan memakai focusCategories yang tersimpan di sesinya.
    focusCategories: z.array(z.enum(MISTAKE_CATEGORIES)).max(2).optional(),
    // Fitur #6: mock interview. Hanya relevan saat membuat sesi baru.
    // Weekly intent is recognized only so deferred v1 requests get a clear error.
    mode: z.enum(["free", "mock_interview", "answer_practice", "criterion_transfer", "weekly_challenge"]).optional(),
    interviewRole: z.enum(INTERVIEW_ROLES).optional(),
    // Latihan dari lowongan: paket bertanda tangan dari /api/interview-job,
    // hanya untuk memulai mock interview baru.
    jobPack: signedJobPackSchema.optional(),
    practiceTarget: z.object({
      sourceSessionId: z.string().uuid(),
      targetId: z.string().regex(/^[a-f0-9]{64}$/),
    }).optional(),
    transferTarget: z.object({
      sourceRevisionSessionId: z.string().uuid(),
      selectionId: z.string().regex(/^[a-f0-9]{64}$/),
    }).optional(),
    message: z.string().trim().min(1).max(2000),
  })
  .refine((d) => d.mode !== "mock_interview" || d.sessionId || d.interviewRole, {
    message: "interviewRole is required to start a mock interview",
  })
  .refine((d) => d.mode !== "answer_practice" || d.sessionId || d.practiceTarget, {
    message: "practiceTarget is required to start an answer revision",
  })
  .refine((d) => !d.practiceTarget || !d.mode || d.mode === "answer_practice", {
    message: "practiceTarget belongs only to answer_practice",
  })
  .refine((d) => d.mode !== "criterion_transfer" || d.sessionId || d.transferTarget, {
    message: "transferTarget is required to start guided application",
  })
  .refine((d) => !d.transferTarget || !d.mode || d.mode === "criterion_transfer", {
    message: "transferTarget belongs only to criterion_transfer",
  })
  .refine((d) => !d.jobPack || (d.mode === "mock_interview" && !d.sessionId), {
    message: "jobPack belongs only to a new mock interview",
  })
  .refine((d) => !d.practiceTarget || !d.transferTarget, {
    message: "Choose either answer revision or guided application",
  });
