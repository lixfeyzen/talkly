CREATE TABLE "conversation_turn_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"session_id" uuid,
	"lease_token" uuid NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"result" jsonb,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_turn_requests_user_id_request_id_unique" UNIQUE("user_id","request_id")
);
--> statement-breakpoint
ALTER TABLE "mistake_patterns" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "conversation_turn_requests" ADD CONSTRAINT "conversation_turn_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_turn_requests" ADD CONSTRAINT "conversation_turn_requests_session_id_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_turn_requests_user_created_idx" ON "conversation_turn_requests" USING btree ("user_id","created_at");