import { randomUUID } from "node:crypto";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  type OAuthClientProvider,
  type OAuthDiscoveryState,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

export type ConnectionAuthState = {
  authorizationUrl?: string;
  redirectUrl?: string;
  clientInformation?: OAuthClientInformationMixed;
  codeVerifier?: string;
  discovery?: OAuthDiscoveryState;
  state?: string;
  tokens?: OAuthTokens;
  walletAddress?: `0x${string}`;
};

export class SessionOAuthProvider implements OAuthClientProvider {
  readonly clientMetadata: OAuthClientMetadata;

  constructor(
    private readonly redirectUrlValue: string,
    private readonly stored: ConnectionAuthState,
  ) {
    this.clientMetadata = {
      client_name: "FillPilot",
      redirect_uris: [redirectUrlValue],
    };
  }

  get redirectUrl() {
    return this.redirectUrlValue;
  }

  state() {
    const state = randomUUID();
    this.stored.state = state;
    return state;
  }

  clientInformation() {
    return this.stored.clientInformation;
  }

  saveClientInformation(clientInformation: OAuthClientInformationMixed) {
    this.stored.clientInformation = clientInformation;
  }

  tokens() {
    return this.stored.tokens;
  }

  saveTokens(tokens: OAuthTokens) {
    this.stored.tokens = tokens;
  }

  redirectToAuthorization(authorizationUrl: URL) {
    this.stored.authorizationUrl = authorizationUrl.toString();
  }

  saveCodeVerifier(codeVerifier: string) {
    this.stored.codeVerifier = codeVerifier;
  }

  codeVerifier() {
    if (!this.stored.codeVerifier) throw new Error("Missing PKCE verifier");
    return this.stored.codeVerifier;
  }

  saveDiscoveryState(discovery: OAuthDiscoveryState) {
    this.stored.discovery = discovery;
  }

  discoveryState() {
    return this.stored.discovery;
  }

  invalidateCredentials() {
    delete this.stored.tokens;
    delete this.stored.codeVerifier;
  }
}

function client() {
  return new Client({ name: "fillpilot", version: "0.1.0" });
}

function transport(serverUrl: string, provider: SessionOAuthProvider) {
  return new StreamableHTTPClientTransport(new URL(serverUrl), {
    authProvider: provider,
  });
}

export async function beginMcpAuthorization(
  serverUrl: string,
  redirectUrl: string,
  stored: ConnectionAuthState = {},
) {
  stored.redirectUrl = redirectUrl;
  const provider = new SessionOAuthProvider(redirectUrl, stored);

  try {
    await client().connect(transport(serverUrl, provider));
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  }

  if (!stored.authorizationUrl || !stored.state || !stored.codeVerifier) {
    throw new Error("KeeperHub did not start an OAuth authorization flow");
  }

  return { authorizationUrl: stored.authorizationUrl, stored };
}

export async function finishMcpAuthorization(
  serverUrl: string,
  redirectUrl: string,
  callback: URLSearchParams,
  stored: ConnectionAuthState,
) {
  const returnedState = callback.get("state");
  const code = callback.get("code");
  if (!returnedState || returnedState !== stored.state || !code) {
    throw new Error("OAuth callback state or code is invalid");
  }

  const provider = new SessionOAuthProvider(redirectUrl, stored);
  const initialTransport = transport(serverUrl, provider);
  await initialTransport.finishAuth(code);

  const connectedClient = client();
  await connectedClient.connect(transport(serverUrl, provider));
  const tools = await connectedClient.listTools();
  if (tools.tools.some((tool) => tool.name === "get_wallet_integration")) {
    const result = await connectedClient.callTool({
      name: "get_wallet_integration",
      arguments: {},
    });
    const walletAddress = extractAddress(result);
    if (walletAddress) stored.walletAddress = walletAddress;
  }
  return { client: connectedClient, stored };
}

export function extractAddress(value: unknown): `0x${string}` | undefined {
  const serialized = JSON.stringify(value);
  const match = serialized.match(/0x[a-fA-F0-9]{40}/);
  return match?.[0] as `0x${string}` | undefined;
}

export function serializeAuthState(state: ConnectionAuthState): string {
  return JSON.stringify(state);
}

export function parseAuthState(value: string): ConnectionAuthState {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object")
    throw new Error("Invalid OAuth session");
  return parsed as ConnectionAuthState;
}
