# CLAUDE.md — working agreement for this repo

Platform monorepo: two apps + one genuinely shared library, deployed to per-PR
ephemeral AWS environments. Read this before changing code.

## Golden rules

1. **Tests always.** Every behaviour change ships with a unit test in the same
   PR. The observability lib's tests (redaction, formatting, provider swap) are a
   CI gate before any deploy. Don't weaken or skip them.
2. **Run tasks through Nx**, never the underlying tool directly:
   `nx test <project>`, `nx lint <project>`, `nx build <project>`,
   `nx run-many -t lint test build`. Use `nx affected -t ...` in CI.
3. **Respect module boundaries.** `libs/*` may depend only on other `libs/*`.
   `libs/observability` must never import an app. Enforced by
   `@nx/enforce-module-boundaries` (see `eslint.config.mjs`).
4. **Keep the observability core runtime-agnostic.** No Node/Express/Angular/DOM
   APIs in `libs/observability/src/lib`. Framework glue lives in the apps.
5. **Never log raw secrets.** Redaction is centralised in `Logger`; don't bypass
   it. If you add a sensitive field name, extend the denylist + test it.

## Layout

```
apps/api    Express. Clean layering: domain shape + application service (HealthService)
            + http controller + server factory + composition root (main.ts).
apps/web    Angular (standalone, signals, zoneless). DI provides a Logger via the
            LOGGER token; runtime API URL comes from /config.json.
libs/observability  Provider-agnostic logging. Core + providers + factory. The ONLY
            shared lib; imported by both apps as @org/observability.
infra/      Terraform: bootstrap (one-time) + ephemeral (per-PR).
docs/specs  Lightweight specs (see the spec-workflow skill).
```

## Conventions

- **TypeScript module resolution is `nodenext`** in the lib and api → relative
  imports use explicit `.js` extensions (e.g. `import './logger.js'`). The web
  app uses `bundler` resolution and overrides `lib`/`composite` in its tsconfig
  (Angular doesn't support TS project references).
- **Dependency Inversion at the seams.** `Logger` depends on the
  `ObservabilityProvider` interface; apps pick the concrete provider via config
  (`OBSERVABILITY_PROVIDER` env / `config.json`), never by editing log calls.
- **Don't over-engineer.** Match the size of the problem. A single `/health`
  endpoint does not need a decorator/middleware layer (see docs/ADR.md §2).
- After adding/removing a project or its tsconfig refs, run `nx sync`.

## Skills & agents

- `architecture` skill — structure, DDD/clean/SOLID rules, "how to add a feature".
- `spec-workflow` skill — spec → plan → implement → test loop for new features.
- `code-auditor` agent — review a diff for SOLID/DDD/test/redaction/boundary issues.
- `test-author` agent — generate focused Jest unit tests.

## Common commands

```bash
npm ci                       # install
nx run-many -t lint test build
nx serve api                 # http://localhost:3000
nx serve web                 # http://localhost:4200
docker compose up --build    # full stack: web :8081, api :3000
```
