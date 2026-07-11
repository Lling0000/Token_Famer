# Token Farmer

Desktop-only, invite-based multiplayer farming game where a unified Token Credit balance
tokens power planting, harvesting, social play, and an OpenAI/Anthropic-compatible
gateway.

## Quick start

```powershell
pnpm install --frozen-lockfile
pnpm compose:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

See [AGENTS.md](./AGENTS.md) for mandatory engineering rules and
[docs/specs/gameplay.md](./docs/specs/gameplay.md) for the product specification.
