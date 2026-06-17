---
name: architecture
description: Use when adding or changing apps/libraries in this Nx monorepo, or when you need the structure, DDD/clean-code/SOLID conventions, module boundaries, and the "how to add a feature" workflow. Read before scaffolding new projects or moving code between layers.
---

# Architecture of this monorepo

A Platform-team reference repo: two apps consume one shared library, deployed to
per-PR ephemeral AWS environments. Optimise for **clear boundaries** and **small,
honest abstractions** — not for ceremony.

## The shape

```
apps/api            Express HTTP service (Node).            tag: type:app, scope:api
apps/web            Angular SPA (browser).                  tag: type:app, scope:web
libs/observability  Provider-agnostic structured logging.   tag: type:lib, scope:observability
```

`apps` are deployable leaves. `libs` are shared, importable building blocks. An
app may depend on libs; a lib may depend only on other libs. This is enforced by
`@nx/enforce-module-boundaries` via the tags above — so the dependency graph can
never invert.

## Layering inside apps/api (DDD-lite, SOLID)

```
domain          plain types / shapes (HealthStatus)             — no I/O
application      services holding business logic (HealthService) — depend on abstractions
infrastructure   express controller + server factory             — adapters to the outside
main.ts          composition root: reads env, wires deps, listens
```

Rules:
- **SRP** — a service has one reason to change. Keep transport (Express) and
  cross-cutting concerns out of domain/application where practical.
- **DIP** — depend on interfaces at the seams. `HealthService` depends on the
  `Logger` abstraction, not a concrete provider.
- **Composition root** — only `main.ts` knows concrete implementations and env.
- **Pragmatism beats purity** — for a trivial endpoint, injecting a logger into
  the service is fine; promote logging to a decorator/middleware only when the
  logic repeats or grows (documented in docs/ADR.md §2).

## The observability library

Core (`libs/observability/src/lib`) is runtime-agnostic: **no Node, Express,
Angular or DOM APIs**. Pieces:

- `LogEntry`, `LogLevel` — the data contract.
- `ObservabilityProvider` — the swap seam (`log(entry)` + optional `flush`).
- `Logger` — builds the entry, redacts secrets, forwards to the provider.
- `providers/` — Console (default), Noop (tests), Datadog (cloud stub).
- `createProvider` / `resolveProviderName` — config-driven selection.

Framework glue (Angular DI, Express composition) lives in the **apps**, never in
the lib. Secrets are redacted centrally in `Logger` — never bypass it.

## How to add a feature

1. Write a short spec under `docs/specs/` (use the `spec-workflow` skill).
2. Put domain types + business logic in the application layer; keep it free of
   transport and framework code.
3. Add the HTTP/UI adapter (controller / Angular component+service).
4. Wire concrete dependencies only in the composition root / DI providers.
5. Add unit tests in the same change. Mock collaborators (e.g. a fake logger).
6. `nx run-many -t lint test build` must be green; `nx sync` if tsconfigs changed.

## How to add a shared lib

```bash
nx g @nx/js:lib <name> --directory=libs/<name> --unitTestRunner=jest
```

Then tag it (`type:lib` + a `scope:*`) in its `package.json` `nx.tags`, and add a
`depConstraints` entry in `eslint.config.mjs` if it introduces a new scope. Keep
the public surface in `src/index.ts` minimal.

## Gotchas

- `nodenext` resolution → use `.js` extensions on relative imports in lib/api.
- Angular can't use TS project references → web overrides `composite`,
  `emitDeclarationOnly`, and `lib` in its tsconfigs.
- After project/tsconfig changes run `nx sync`.
