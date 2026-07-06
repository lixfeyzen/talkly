CREATE INDEX "conversation_sessions_user_created_idx" ON "conversation_sessions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interview_reports_user_created_idx" ON "interview_reports" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mistake_patterns_user_created_idx" ON "mistake_patterns" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mistake_patterns_session_idx" ON "mistake_patterns" USING btree ("session_id");