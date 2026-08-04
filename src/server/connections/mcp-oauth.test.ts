import { describe, expect, it } from "vitest";

import { extractAddress, SessionOAuthProvider } from "./mcp-oauth";

describe("MCP OAuth provider", () => {
  it("keeps PKCE and token records in the server-held session state", async () => {
    const stored: Record<string, unknown> = {};
    const provider = new SessionOAuthProvider(
      "https://fillpilot.test/callback",
      stored,
    );
    const state = await provider.state();
    await provider.saveCodeVerifier("verifier");
    await provider.saveTokens({ access_token: "access", token_type: "Bearer" });

    expect(state).toBe(stored.state);
    expect(provider.codeVerifier()).toBe("verifier");
    expect(provider.tokens()).toMatchObject({ access_token: "access" });
  });

  it("extracts only a valid EVM address from a wallet integration response", () => {
    expect(
      extractAddress({
        content: [
          { text: "Wallet: 0x1111111111111111111111111111111111111111" },
        ],
      }),
    ).toBe("0x1111111111111111111111111111111111111111");
    expect(
      extractAddress({ content: [{ text: "no wallet" }] }),
    ).toBeUndefined();
  });
});
