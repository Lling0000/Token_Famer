# Project

Token Farmer is an invite-only, desktop-browser farming game backed by one unified Token Credit wallet. A user API key may call any allowed catalog model, while each planting keeps its selected model identity for flower appearance and audit metadata. The first production-shaped release includes account security, API keys, sandbox model access, farming, friends, stealing, leaderboards, and sandbox payments. It does not include mobile clients, cash withdrawal, player-to-player transfers, blockchain assets, or real-money random rewards.

The repository is a pnpm 10.14.0 TypeScript monorepo running on Node.js 22:

- `apps/web`: Next.js and native Canvas 2D desktop client. It never connects to PostgreSQL or Redis.
- `apps/api`: Fastify HTTP and model-compatible API composition root.
- `apps/worker`: BullMQ jobs and scheduled projections.
- `modules/*`: business modules (`auth`, `wallet`, `gateway`, `farm`, `social`, `payment`, `leaderboard`, `admin`).
- `packages/primitives`: IDs, integer Token values, UTC time values, and shared errors.
- `packages/contracts`: Zod wire contracts and public DTOs.
- `packages/db-runtime`: connection and transaction primitives; it must not export business tables.
- `database`: schemas, generated migrations, fixtures, and migration checks.
- `infra`: Docker, Caddy, deployment, and operational assets.
- `docs`: architecture, engineering rules, specifications, ADRs, and runbooks.

The authoritative product boundaries are in `docs/product-scope.md`.

# Commands

Run commands from the repository root.

| Purpose                                 | Command                          |
| --------------------------------------- | -------------------------------- |
| Install exactly the locked dependencies | `pnpm install --frozen-lockfile` |
| Start local development                 | `pnpm dev`                       |
| Start local infrastructure              | `pnpm compose:up`                |
| Stop local infrastructure               | `pnpm compose:down`              |
| Check formatting                        | `pnpm format:check`              |
| Lint and enforce code constraints       | `pnpm lint`                      |
| Check module dependencies               | `pnpm architecture:check`        |
| Type-check all workspaces               | `pnpm typecheck`                 |
| Run unit tests                          | `pnpm test:unit`                 |
| Run property tests                      | `pnpm test:property`             |
| Run integration tests                   | `pnpm test:integration`          |
| Run HTTP/provider contract tests        | `pnpm test:contract`             |
| Run Playwright smoke tests              | `pnpm test:e2e`                  |
| Build production applications           | `pnpm build`                     |
| Build production containers             | `pnpm docker:build`              |
| Generate a reviewed migration           | `pnpm db:generate`               |
| Migrate a local database                | `pnpm db:migrate`                |
| Apply committed production migrations   | `pnpm db:migrate:deploy`         |
| Seed local/test data                    | `pnpm db:seed`                   |
| Check empty and upgrade migrations      | `pnpm db:check`                  |
| Run the complete local gate             | `pnpm verify`                    |

Do not substitute an unlocked install, edit a generated lockfile by hand, or run a write-mode formatter over unrelated files.

# Architecture

The only valid inward dependency direction inside a module is:

```text
HTTP/UI -> Application Service -> Domain -> Repository/External Port
                                          ^
                                  Database/External Adapter
```

Each business module owns its domain logic and tables. Its folders are `domain/`, `application/`, `ports/`, `adapters/`, `http/`, plus a public `index.ts`. Code outside the module may import only that public `index.ts`.

- Applications must not import one another.
- `apps/web` may import only browser-safe packages, UI, and contracts. It must not import `modules`, `database`, or `db-runtime`.
- Domain code must not import Fastify, Next.js, React, Drizzle, PostgreSQL, Redis, BullMQ, process environment, network clients, system time, or global randomness.
- A module must not import another module's adapters, repositories, schema, or tables.
- Cross-module work uses the target module's public application port. For example, `farm` never updates a wallet row; it calls the public Wallet service.
- A cross-module atomic workflow uses the shared transaction context from `db-runtime`; each participating module still executes through its own repository and public service.
- `leaderboard` consumes domain events and owns projections. It does not query another module's private business tables.
- `admin` composes public application services. It never bypasses validation by writing business tables.
- TeamoRouter, model providers, Alipay, email, clock, random generation, object storage, and queues are adapters behind explicit ports.

Dependency boundaries are enforced by ESLint and dependency-cruiser. Update `docs/architecture.md` and add an ADR before changing a boundary.

# Engineering Rules

- Controllers and React components contain no price, probability, permission, Token, growth, or settlement calculations.
- A React component must not fetch data, calculate domain policy, and render the result in one component. Fetch in a query/hook, calculate in the domain/application layer, and render in the component.
- Modules never access another module's tables.
- Token balances change only through WalletService and append-only ledger entries. Never issue a direct balance correction.
- Money, Token values, quantities, scores, and rates use integer or `bigint` representations. PostgreSQL uses `numeric(38,0)`; JSON represents these values as decimal strings. Floating-point arithmetic is forbidden for economic state.
- Persist instants as UTC `timestamptz`. Convert to `Asia/Shanghai` only at presentation and when deriving documented leaderboard boundaries.
- The server is authoritative for prices, probability, maturity, inventory, permissions, balances, stealing, and rewards. Treat client-supplied calculated values as untrusted.
- Every write endpoint accepts `Idempotency-Key`; every financial or reward write persists and enforces it transactionally.
- Price, growth, harvest, stealing, dog, and land rules come from immutable, versioned configuration. Domain code contains no rule magic numbers.
- Pure economic functions receive the current instant and deterministic random input explicitly. They do not call `Date.now()`, `new Date()`, `Math.random()`, environment variables, databases, or the network.
- External systems are reached only through typed adapter interfaces.
- Every bug fix includes a regression test that fails without the fix.
- Do not create `BaseService`, `BaseRepository`, catch-all `utils.ts`, or equivalent generic dumping grounds.
- Abstract only after three stable instances of real duplication. Do not build frameworks for hypothetical future requirements.
- A TODO must use `TODO(#issue-number): reason`. TODOs without a tracked issue are forbidden.

Complexity triggers are enforced for ordinary source files:

- File length: 400 lines.
- Function length: 50 lines.
- Function parameters: 5; use a named parameter object above this limit.
- Cyclomatic complexity: 10.
- Repository duplication: 3% via jscpd.
- Pull request effective code size: 500 added/deleted lines unless labeled `large-change-approved`.

Generated migrations, database schema declarations, versioned configuration tables, lockfiles, and reviewed production art may receive narrowly configured exceptions. Any other exception must use a local disable with a reason; never disable the rule for an entire file or repository.

# Change Safety

- Use expand/backfill/dual-read-or-write/contract migrations. Do not remove, rename, or tighten a production column in the same release that introduces its replacement.
- The old application version must continue to run through an expand release. Destructive contract migrations wait at least one deployed release and require a tested rollback or restore procedure.
- Back up the database before production migrations. Run both empty-database and existing-snapshot upgrade checks.
- Never commit `.env`, production credentials, provider tokens, API keys, private keys, certificates, database dumps, or unredacted logs. `.env.example` contains placeholders only.
- API keys are shown once and stored only as a prefix plus a keyed hash. Logs and traces must redact authorization, cookies, prompts, payment signatures, and credentials.
- Do not commit `.next`, `dist`, coverage, logs, temporary screenshots, database snapshots, or local caches. Reviewed migrations, lockfiles, and production pixel assets are versioned exceptions.
- Do not edit unrelated code, reformat unrelated directories, or overwrite user changes. Keep commits and pull requests scoped to one coherent concern.
- Do not mix security dependency upgrades with feature work.
- Changes to module ownership, dependencies, transaction boundaries, public contracts, or data ownership require an ADR and updated architecture/specification documents.

# Verification

Run the smallest required set while developing and the full required set before merge.

| Change                                          | Required verification                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only                              | `pnpm format:check` plus link/Markdown checks included by lint                                                                   |
| Domain or economy rule                          | `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:property`                                                            |
| Database schema/repository                      | Domain checks plus `pnpm db:check`, `pnpm test:integration`                                                                      |
| HTTP API or contract                            | Type-check, unit, integration, and `pnpm test:contract`                                                                          |
| UI or Canvas 2D                                 | Type-check, relevant unit/component tests, `pnpm test:e2e`, required desktop screenshots                                         |
| Auth, wallet, payment, gateway key, or security | Full `pnpm verify` and the security-specific regression cases                                                                    |
| Infrastructure/deployment                       | `docker compose -f infra/docker-compose.prod.yml config`, image build, health checks, restore test, restart test, and smoke test |
| Bug fix                                         | The affected matrix row plus a dedicated regression test                                                                         |

Before release, CI must pass format, lint, type-check, unit, property, integration, contract, architecture, migration, production build, and Playwright smoke jobs.

# References

- `docs/architecture.md`: module ownership, allowed dependency matrix, events, and transactions.
- `docs/engineering.md`: coding patterns, complexity exceptions, review, and migration workflow.
- `docs/security.md`: authentication, key handling, payment, logging, and operational controls.
- `docs/product-scope.md`: supported, gated, and explicitly unsupported capabilities.
- `docs/specs/gameplay.md`: land, crop, growth, maintenance, friends, stealing, and ranking behavior.
- `docs/specs/economy.md`: model wallets, charging, grants, reserves, harvest, and conservation rules.
- `docs/specs/api.md`: HTTP/SSE contracts, idempotency, errors, and compatibility endpoints.
- `docs/runbooks/deployment.md`: server, DNS, HTTPS, rollout, smoke test, and rollback.
- `docs/runbooks/backup-restore.md`: PostgreSQL backup and verified recovery.
- `docs/runbooks/branch-protection.md`: required GitHub repository settings and checks.
- `docs/adr/`: accepted architecture decisions and their consequences.
