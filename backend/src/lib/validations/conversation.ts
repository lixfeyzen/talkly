import { z } from "zod";

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  scenario: z.string().trim().min(1).max(200).optional(),
  targetLanguage: z.string().trim().min(1).max(50).optional(),
  message: z.string().trim().min(1).max(2000),
});
