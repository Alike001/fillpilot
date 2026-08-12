# FillPilot

FillPilot is a deterministic execution agent for one Base-mainnet goal: sell USDC for WETH by a deadline, with at most one rule-bound replacement. KeeperHub is the only sender for judged onchain writes; CoW Protocol supplies the order and settlement path.

## Verified KeeperHub execution

FillPilot has one independently verified Base Sepolia testnet execution through KeeperHub:

- KeeperHub execution ID: `dpnxfa52zwzoz58pod0f4`
- [Base Sepolia transaction receipt](https://sepolia.basescan.org/tx/0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa)
- Result: succeeded, zero ETH value, `Flightcheck` event emitted by the reviewed contract

This proof is intentionally narrow. It is a bounded call to an external public testnet canary, not a FillPilot-owned contract, CoW order, token approval, or financial fill. It proves the KeeperHub execution path without inventing a completed trading lifecycle. Run the app and open `/proof/base-sepolia-canary-20260812` to view the human-readable receipt record.

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

## Quality commands

```bash
pnpm verify
pnpm test:fork
pnpm test:coverage
```

`pnpm verify` runs formatting, linting, strict types, local secret and file-size checks, unit/integration tests, migration consistency, both production builds, and responsive browser smoke tests. Database integration tests run when `TEST_DATABASE_URL` is set; CI always supplies it.

Mainnet writes are never part of automated tests. Any funded run requires an exact preflight and explicit human approval.
