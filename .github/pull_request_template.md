## Specification

<!-- Link the governing spec/ADR and the issue. Use "N/A - reason" only when genuinely not applicable. -->

- Spec/ADR:
- Issue:

## Change

<!-- State one coherent outcome. List affected domain modules and public contracts. -->

## Boundaries

- [ ] No module reads or writes another module's private tables.
- [ ] Controllers/components contain no business calculation.
- [ ] Any architecture or public-contract change includes docs and an ADR.
- [ ] This PR does not reformat or change unrelated code.

## Risk

<!-- Cover balances, concurrency, retries, providers, privacy, and compatibility as applicable. -->

## Data And Migration

- [ ] No database change.
- [ ] Expand/backfill/contract plan and old-version compatibility are documented below.
- [ ] Backup point, lock/data-volume risk, verification query, and restore path are documented below.

Details:

## Verification

<!-- Paste commands and concise results. Bug fixes must name the regression test. -->

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm architecture:check`
- [ ] `pnpm typecheck`
- [ ] Required unit/property/integration/contract tests
- [ ] `pnpm build`
- [ ] Playwright smoke/screenshots when UI or Phaser changed

Commands/results:

```text

```

## Rollback

<!-- Give the previous SHA, feature flag/adapter gate, and data recovery or compensation procedure. -->

## UI Evidence

<!-- Attach 1280x720, 1440x900, 1920x1080, and 2560x1440 evidence for UI/Phaser changes; otherwise N/A. -->

## Security And Secrets

- [ ] No credential, private key, certificate, production data, Prompt/response body, or unredacted log is included.
- [ ] Auth, wallet, payment, gateway, or deployment changes ran the complete security verification set.
- [ ] Dependency/security updates are not mixed with feature work.
