import { z } from "zod";
import { MISTAKE_CATEGORIES } from "@/lib/ai/mistake-categories";

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  scenario: z.string().trim().min(1).max(200).optional(),
  targetLanguage: z.string().trim().min(1).max(50).optional(),
  // Latihan terarah (fitur #3): hanya dipakai saat MEMBUAT sesi baru --
  // sesi lanjutan memakai focusCategories yang tersimpan di sesinya.
  focusCategories: z.array(z.enum(MISTAKE_CATEGORIES)).max(2).optional(),
  message: z.string().trim().min(1).max(2000),
});
