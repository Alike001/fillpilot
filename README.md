# FillPilot

FillPilot is designed as a deterministic execution agent for one Base-mainnet goal: sell USDC for WETH by a deadline, with at most one rule-bound replacement. KeeperHub is the only sender for judged onchain writes; CoW Protocol supplies the order and settlement path. The current hosted build keeps the economic write lifecycle disabled and exposes the policy, read and simulation boundaries, and one independently verified Base Sepolia execution proof.

Public app: [fillpilot-six.vercel.app](https://fillpilot-six.vercel.app)

This repository is a working execution foundation. It does not currently claim a completed autonomous CoW fill, token approval, replacement, or settlement lifecycle.

## Verified KeeperHub execution

FillPilot has one independently verified Base Sepolia testnet execution through KeeperHub:

- KeeperHub execution ID: `dpnxfa52zwzoz58pod0f4`
- [Base Sepolia transaction receipt](https://sepolia.basescan.org/tx/0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa)
- Result: succeeded, zero ETH value, `Flightcheck` event emitted by the reviewed contract

This proof is intentionally narrow. It is a bounded Base Sepolia call to an external public testnet canary, not a FillPilot-owned contract, CoW order, token approval, or financial fill. It proves the KeeperHub execution path without inventing a completed trading lifecycle. Base mainnet is the intended production execution profile, but no mainnet write is enabled in the hosted build. Run the app and open `/proof/base-sepolia-canary-20260812` to view the human-readable receipt record.

Do not replay this canary. The transaction already exists and is the submission evidence for the main track.

## Local setup

Requirements: Node.js 24+, pnpm 10+, and Docker.

```bash
cp .env.example .env.local
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Run the worker in a second terminal:

```bash
pnpm dev:worker
```

The app is available at `http://127.0.0.1:3000`. The worker checks PostgreSQL readiness and then waits for later lifecycle phases; it cannot broadcast a transaction.

KeeperHub OAuth requires a server-only 32-byte encryption key. Generate one locally, then place the base64 output in `.env.local`:

```bash
openssl rand -base64 32
```

The default local profile keeps both mainnet and testnet writes disabled. Optional testnet read/simulation variables are `EXECUTION_NETWORK=ethereum-sepolia` and `SEPOLIA_RPC_URL=<your-HTTPS-RPC-url>`. A KeeperHub API key is only needed for server-side direct API calls and must never be placed in browser code.

## Quality commands

```bash
pnpm verify
pnpm test:fork
pnpm test:coverage
```

`pnpm verify` runs formatting, linting, strict types, local secret and file-size checks, unit/integration tests, migration consistency, both production builds, and responsive browser smoke tests. Database and fork suites require the isolated test environment from `.env.local`; without it, Vitest skips those suites. Run them explicitly with:

```bash
node --env-file=.env.local node_modules/vitest/vitest.mjs run --project integration
node --env-file=.env.local node_modules/vitest/vitest.mjs run --project fork
```

The current hosted build leaves mainnet and testnet writes disabled. The file-size gate currently reports an oversized repository module, so treat `pnpm verify` as the complete quality gate rather than assuming a green result from a partial test command.

Mainnet writes are never part of automated tests. Any funded run requires an exact preflight and explicit human approval.

## Known boundaries

- The worker lifecycle is intentionally disabled in the hosted build.
- No contract is deployed by FillPilot.
- The Base Sepolia receipt is external canary evidence for KeeperHub execution, not a FillPilot-owned financial fill.
- The product does not hold user private keys in the browser.
