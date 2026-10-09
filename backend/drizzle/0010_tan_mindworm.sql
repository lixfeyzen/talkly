CREATE TABLE "weekly_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"status" text DEFAULT 'locked' NOT NULL,
	"scenario" text NOT NULL,
	"focus_category" text,
	"score" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_challenges_user_id_week_number_unique" UNIQUE("user_id","week_number")
);
--> statement-breakpoint
ALTER TABLE "weekly_challenges" ADD CONSTRAINT "weekly_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weekly_challenges_user_status_idx" ON "weekly_challenges" USING btree ("user_id","status");