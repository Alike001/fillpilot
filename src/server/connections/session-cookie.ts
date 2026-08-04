import { decryptSecret, encryptSecret } from "./crypto";

export const CONNECTION_COOKIE = "fillpilot_keeperhub";

export function sealConnectionSession(value: unknown): string {
  return encryptSecret(JSON.stringify(value));
}

export function openConnectionSession<T>(
  value: string | undefined,
): T | undefined {
  if (!value) return undefined;
  return JSON.parse(decryptSecret(value)) as T;
}
