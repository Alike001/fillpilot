# FillPilot

FillPilot is a deterministic execution agent for one Base-mainnet goal: sell USDC for WETH by a deadline, with at most one rule-bound replacement. KeeperHub is the only sender for judged onchain writes; CoW Protocol supplies the order and settlement path.

This repository is currently at the foundation milestone. Its routes are honest shells: no transaction, proof, or KeeperHub execution is fabricated.

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

The app is available at `http://localhost:3000`. The worker checks PostgreSQL readiness and then waits for later lifecycle phases; it cannot broadcast a transaction.

## Quality commands

```bash
pnpm verify
pnpm test:fork
pnpm test:coverage
```

`pnpm verify` runs formatting, linting, strict types, local secret and file-size checks, unit/integration tests, migration consistency, both production builds, and responsive browser smoke tests. Database integration tests run when `TEST_DATABASE_URL` is set; CI always supplies it.

Mainnet writes are never part of automated tests. Any funded run requires an exact preflight and explicit human approval.
