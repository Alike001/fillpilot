ALTER TABLE "keeperhub_executions" ADD COLUMN "chain_id" integer DEFAULT 8453 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "decisions_goal_input_hash_idx" ON "decisions" USING btree ("goal_id","input_hash");
