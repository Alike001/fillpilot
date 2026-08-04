import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const goalState = pgEnum("goal_state", [
  "DRAFT",
  "READY",
  "WATCHING",
  "REPLACING",
  "FULFILLED",
  "MISSED",
  "FAILED",
]);

export const orderRole = pgEnum("order_role", ["INITIAL", "REPLACEMENT"]);

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationFingerprint: text("organization_fingerprint").notNull(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
    encryptedTokens: text("encrypted_tokens").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("connections_org_idx").on(table.organizationFingerprint),
  ],
);

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .references(() => connections.id, { onDelete: "restrict" })
    .notNull(),
  chainId: integer("chain_id").default(8453).notNull(),
  sellToken: varchar("sell_token", { length: 42 }).notNull(),
  buyToken: varchar("buy_token", { length: 42 }).notNull(),
  sellAmount: numeric("sell_amount", { precision: 78, scale: 0 }).notNull(),
  preferredBuyAmount: numeric("preferred_buy_amount", {
    precision: 78,
    scale: 0,
  }).notNull(),
  minimumBuyAmount: numeric("minimum_buy_amount", {
    precision: 78,
    scale: 0,
  }).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  state: goalState("state").default("DRAFT").notNull(),
  replacementCount: integer("replacement_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .references(() => goals.id, { onDelete: "cascade" })
      .notNull(),
    role: orderRole("role").notNull(),
    uid: varchar("uid", { length: 114 }),
    digest: varchar("digest", { length: 66 }).notNull(),
    payload: jsonb("payload").notNull(),
    sellAmount: numeric("sell_amount", { precision: 78, scale: 0 }).notNull(),
    buyAmount: numeric("buy_amount", { precision: 78, scale: 0 }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }).notNull(),
    externalStatus: text("external_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("orders_goal_role_idx").on(table.goalId, table.role),
    uniqueIndex("orders_uid_idx").on(table.uid),
  ],
);
