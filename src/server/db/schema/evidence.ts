import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { goals } from "./core";

export const executionState = pgEnum("execution_state", [
  "SIMULATED",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
]);

export const workState = pgEnum("work_state", [
  "PENDING",
  "LEASED",
  "COMPLETE",
  "DEAD",
]);

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    ruleVersion: text("rule_version").notNull(),
    inputHash: varchar("input_hash", { length: 66 }).notNull(),
    inputs: jsonb("inputs").notNull(),
    output: text("output").notNull(),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("decisions_goal_input_hash_idx").on(
      table.goalId,
      table.inputHash,
    ),
  ],
);

export const keeperhubExecutions = pgTable(
  "keeperhub_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    chainId: integer("chain_id").default(8453).notNull(),
    simulation: jsonb("simulation").notNull(),
    executionId: text("execution_id"),
    state: executionState("state").default("SIMULATED").notNull(),
    transactionHash: varchar("transaction_hash", { length: 66 }),
    transactionLink: text("transaction_link"),
    gasUsed: text("gas_used"),
    error: jsonb("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("keeperhub_executions_idempotency_idx").on(
      table.idempotencyKey,
    ),
  ],
);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .references(() => goals.id, { onDelete: "cascade" })
    .notNull(),
  sequence: integer("sequence").notNull(),
  source: text("source").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workItems = pgTable(
  "work_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    kind: text("kind").notNull(),
    deduplicationKey: text("deduplication_key").notNull(),
    state: workState("state").default("PENDING").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastError: jsonb("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("work_items_deduplication_idx").on(table.deduplicationKey),
  ],
);
