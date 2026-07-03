CREATE TABLE "interview_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_reports_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD COLUMN "mode" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD COLUMN "interview_role" text;--> statement-breakpoint
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_session_id_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE cascade ON UPDATE no action;