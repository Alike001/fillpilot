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

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: optionalUrl,
  TEST_DATABASE_URL: optionalUrl,
  APP_URL: z.url().default("http://127.0.0.1:3000"),
  KEEPERHUB_MCP_URL: z.url().default("https://app.keeperhub.com/mcp"),
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
