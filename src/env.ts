import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const optionalEncryptionKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .refine(
      (value) => Buffer.from(value, "base64").byteLength === 32,
      "TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes",
    )
    .optional(),
);

const optionalKeeperHubApiKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^kh_[A-Za-z0-9_-]+$/, "KEEPERHUB_API_KEY must start with kh_")
    .optional(),
);

const writeEnablement = z
  .preprocess(
    (value) => (value === "" ? undefined : value),
    z.literal("true").optional(),
  )
  .transform((value) => value === "true");

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: optionalUrl,
  TEST_DATABASE_URL: optionalUrl,
  APP_URL: z.url().default("http://127.0.0.1:3000"),
  KEEPERHUB_MCP_URL: z.url().default("https://app.keeperhub.com/mcp"),
  KEEPERHUB_API_KEY: optionalKeeperHubApiKey,
  ENABLE_MAINNET_WRITES: writeEnablement,
  TOKEN_ENCRYPTION_KEY: optionalEncryptionKey,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function requireDatabaseUrl(env = parseServerEnv()): string {
  if (env.NODE_ENV === "test") {
    if (!env.TEST_DATABASE_URL) {
      throw new Error(
        "TEST_DATABASE_URL is required for database operations in tests",
      );
    }
    return env.TEST_DATABASE_URL;
  }
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database operations");
  }

  return env.DATABASE_URL;
}

export function requireKeeperHubApiKey(env = parseServerEnv()): string {
  if (!env.KEEPERHUB_API_KEY) {
    throw new Error(
      "KEEPERHUB_API_KEY is required for KeeperHub direct API requests",
    );
  }
  return env.KEEPERHUB_API_KEY;
}

/** Mainnet writes are server-only and fail closed by default. */
export function requireMainnetWritesEnabled(env = parseServerEnv()): void {
  if (!env.ENABLE_MAINNET_WRITES) {
    throw new Error(
      "Mainnet writes are disabled. Set ENABLE_MAINNET_WRITES=true only after explicit operator approval.",
    );
  }
}
