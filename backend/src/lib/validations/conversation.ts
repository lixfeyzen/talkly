import { z } from "zod";
import { MISTAKE_CATEGORIES } from "@/lib/ai/mistake-categories";
import { INTERVIEW_ROLES } from "@/lib/ai/interview";

export const sendMessageSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    scenario: z.string().trim().min(1).max(200).optional(),
    targetLanguage: z.string().trim().min(1).max(50).optional(),
    // Latihan terarah (fitur #3): hanya dipakai saat MEMBUAT sesi baru --
    // sesi lanjutan memakai focusCategories yang tersimpan di sesinya.
    focusCategories: z.array(z.enum(MISTAKE_CATEGORIES)).max(2).optional(),
    // Fitur #6: mock interview. Hanya relevan saat membuat sesi baru.
    mode: z.enum(["free", "mock_interview"]).optional(),
    interviewRole: z.enum(INTERVIEW_ROLES).optional(),
    message: z.string().trim().min(1).max(2000),
  })
  .refine((d) => d.mode !== "mock_interview" || d.sessionId || d.interviewRole, {
    message: "interviewRole is required to start a mock interview",
  });
