CREATE TYPE "public"."goal_state" AS ENUM('DRAFT', 'READY', 'WATCHING', 'REPLACING', 'FULFILLED', 'MISSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."order_role" AS ENUM('INITIAL', 'REPLACEMENT');--> statement-breakpoint
CREATE TYPE "public"."execution_state" AS ENUM('SIMULATED', 'SUBMITTED', 'CONFIRMED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."work_state" AS ENUM('PENDING', 'LEASED', 'COMPLETE', 'DEAD');--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_fingerprint" text NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"encrypted_tokens" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"chain_id" integer DEFAULT 8453 NOT NULL,
	"sell_token" varchar(42) NOT NULL,
	"buy_token" varchar(42) NOT NULL,
	"sell_amount" numeric(78, 0) NOT NULL,
	"preferred_buy_amount" numeric(78, 0) NOT NULL,
	"minimum_buy_amount" numeric(78, 0) NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"state" "goal_state" DEFAULT 'DRAFT' NOT NULL,
	"replacement_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"role" "order_role" NOT NULL,
	"uid" varchar(114),
	"digest" varchar(66) NOT NULL,
	"payload" jsonb NOT NULL,
	"sell_amount" numeric(78, 0) NOT NULL,
	"buy_amount" numeric(78, 0) NOT NULL,
	"valid_to" timestamp with time zone NOT NULL,
	"external_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"rule_version" text NOT NULL,
	"input_hash" varchar(66) NOT NULL,
	"inputs" jsonb NOT NULL,
	"output" text NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keeperhub_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"simulation" jsonb NOT NULL,
	"execution_id" text,
	"state" "execution_state" DEFAULT 'SIMULATED' NOT NULL,
	"transaction_hash" varchar(66),
	"transaction_link" text,
	"gas_used" text,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"deduplication_key" text NOT NULL,
	"state" "work_state" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"last_error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeperhub_executions" ADD CONSTRAINT "keeperhub_executions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connections_org_idx" ON "connections" USING btree ("organization_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_goal_role_idx" ON "orders" USING btree ("goal_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_uid_idx" ON "orders" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "keeperhub_executions_idempotency_idx" ON "keeperhub_executions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "work_items_deduplication_idx" ON "work_items" USING btree ("deduplication_key");