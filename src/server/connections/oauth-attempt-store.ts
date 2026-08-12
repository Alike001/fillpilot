import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "./crypto";
import type { ConnectionAuthState } from "./mcp-oauth";
import { createDatabase } from "@/server/db/client";
import { oauthAttempts } from "@/server/db/schema";

const MAX_AGE_MS = 10 * 60 * 1000;
const STORE_DIRECTORY = join(tmpdir(), "fillpilot-oauth-attempts");

type StoredAttempt = {
  createdAt: number;
  state: ConnectionAuthState;
};

export async function createOAuthAttempt(
  state: ConnectionAuthState,
): Promise<string> {
  const id = randomUUID();
  if (usesDatabaseStore()) {
    await writeDatabaseAttempt(id, { createdAt: Date.now(), state });
    return id;
  }
  await writeAttempt(id, { createdAt: Date.now(), state });
  return id;
}

export async function readOAuthAttempt(
  id: string,
): Promise<ConnectionAuthState | undefined> {
  if (!isAttemptId(id)) return undefined;

  if (usesDatabaseStore()) return readDatabaseAttempt(id);

  try {
    const encrypted = await readFile(attemptPath(id), "utf8");
    const attempt = JSON.parse(decryptSecret(encrypted)) as StoredAttempt;
    if (Date.now() - attempt.createdAt > MAX_AGE_MS) {
      await unlink(attemptPath(id)).catch(() => undefined);
      return undefined;
    }
    return attempt.state;
  } catch {
    return undefined;
  }
}

export async function saveOAuthAttempt(
  id: string,
  state: ConnectionAuthState,
): Promise<void> {
  if (!isAttemptId(id)) throw new Error("Invalid OAuth attempt identifier");
  if (usesDatabaseStore()) {
    await writeDatabaseAttempt(id, { createdAt: Date.now(), state });
    return;
  }
  await writeAttempt(id, { createdAt: Date.now(), state });
}

function usesDatabaseStore(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function readDatabaseAttempt(
  id: string,
): Promise<ConnectionAuthState | undefined> {
  const { client, db } = createDatabase();
  try {
    const [row] = await db
      .select()
      .from(oauthAttempts)
      .where(eq(oauthAttempts.id, id))
      .limit(1);
    if (!row) return undefined;

    if (Date.now() - row.createdAt.getTime() > MAX_AGE_MS) {
      await db.delete(oauthAttempts).where(eq(oauthAttempts.id, id));
      return undefined;
    }
    return JSON.parse(decryptSecret(row.encryptedState)) as ConnectionAuthState;
  } catch {
    return undefined;
  } finally {
    await client.end();
  }
}

async function writeDatabaseAttempt(id: string, attempt: StoredAttempt) {
  const { client, db } = createDatabase();
  try {
    await db
      .insert(oauthAttempts)
      .values({
        id,
        encryptedState: encryptSecret(JSON.stringify(attempt)),
        createdAt: new Date(attempt.createdAt),
      })
      .onConflictDoUpdate({
        target: oauthAttempts.id,
        set: {
          encryptedState: encryptSecret(JSON.stringify(attempt)),
          createdAt: new Date(attempt.createdAt),
        },
      });
  } finally {
    await client.end();
  }
}

async function writeAttempt(id: string, attempt: StoredAttempt): Promise<void> {
  await mkdir(STORE_DIRECTORY, { recursive: true, mode: 0o700 });
  await writeFile(attemptPath(id), encryptSecret(JSON.stringify(attempt)), {
    encoding: "utf8",
    mode: 0o600,
  });
}

function attemptPath(id: string): string {
  return join(STORE_DIRECTORY, `${id}.json`);
}

function isAttemptId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
