# Challenge

An Nx monorepo with two apps, one genuinely shared observability library, and a
CI/CD pipeline that spins up a **real, public, per-PR ephemeral environment on
AWS** and tears it down when the PR closes.

- `apps/api` — Express + TypeScript. `GET /health` → `{ "status": "ok", "service": "api" }`.
- `apps/web` — Angular (standalone, signals). Calls `/health`, shows live/error state.
- `libs/observability` — provider-agnostic structured logging, imported by **both** apps.
- `infra/` — Terraform (bootstrap once + ephemeral per-PR).
- `.github/workflows/` — CI gate + ephemeral environment lifecycle.

Decisions and trade-offs live in **[docs/ADR.md](docs/ADR.md)** — read that first.


---

## Run it locally

```bash
npm ci

# Option A — Nx dev servers
nx serve api      # http://localhost:3000  (GET /health)
nx serve web      # http://localhost:4200  (reads /config.json -> calls the API)

# Option B — full containerised stack
docker compose up --build
#   web -> http://localhost:8081
#   api -> http://localhost:3000/health
```

The web app reads its API URL at **runtime** from `/config.json`, so the same
build runs locally, in docker-compose, and in any per-PR environment without
recompiling.

### Building (and how Nx builds the shared lib for you)

From a fresh clone you only need `npm ci`.

```bash
npm ci                          # install + link the workspace packages
nx build @org/observability     # build ONLY the lib -> libs/observability/dist (+ .d.ts)
nx build api                    # builds the lib first if needed, then bundles the API
nx serve web                    # same: lib first, then the dev server
nx sync                         # re-sync TS project references after adding/removing a project
nx graph                        # visualise what depends on what
```


### Quality gate

```bash
nx run-many -t lint test build      # everything
nx test @org/observability          # the library's unit tests (the CI gate)
nx affected -t lint test --base=main # only what changed
```

---

## The observability library

One shared library, imported by both apps as `@org/observability` — never copied.

- **Runtime-agnostic core**: zero Node/Express/Angular/DOM dependencies, so the
  Node API and the browser app use the exact same code.
- **Provider-agnostic**: `Logger` builds + redacts the entry and forwards it to an
  injected `ObservabilityProvider`. Swap the provider to change backend.
  - `ConsoleProvider` (default, structured JSON) · `NoopProvider` (tests) ·
    `DatadogProvider` (cloud **stub**).
- **Secrets never leak**: redaction is centralised in `Logger`; any context key
  containing `password|token|secret|authorization|key` becomes `[REDACTED]`.

Full details: [libs/observability/README.md](libs/observability/README.md).

---

## Hosting & the ephemeral PR environment

**Provider: AWS.** Per PR:

- **API** → container image on **Lambda**, exposed by a public HTTPS **Function
  URL** (AWS Lambda Web Adapter runs the same Express server unchanged).
- **Frontend** → Angular static files on a public **S3 website** bucket.

Why this and not ECS: no always-on cost, fast create/destroy, no domain/cert
needed, and nothing left running to bill a fresh account. Trade-offs in ADR §4.

### How the lifecycle works (`.github/workflows/ephemeral.yml`)

- **PR opened / synchronized / reopened** → run tests (gate) → build & push the
  API image to ECR → `terraform apply` (state keyed `ephemeral/pr-<n>`) → build the
  frontend, write `config.json` with this PR's API URL, sync to S3 → health-check
  both → post/update a **sticky PR comment** with the two live URLs.
- **PR closed** → `terraform destroy` for that PR → update the comment to "removed".

Each PR gets uniquely named resources and its own Terraform state, so concurrent
PRs are fully isolated, and closing a PR leaves nothing behind.

### One-time setup before the pipeline works

1. Create the Terraform state bucket (see
   [infra/bootstrap/README.md](infra/bootstrap/README.md)).
2. `cd infra/bootstrap && terraform init -backend-config=backend.hcl && terraform apply`
   (creates ECR, the GitHub OIDC provider, the deploy role, the Lambda role).
3. Add the GitHub repo **secret** `AWS_DEPLOY_ROLE_ARN` =
   `terraform output -raw gha_deploy_role_arn`.

CI authenticates to AWS via **OIDC** — there are no long-lived AWS keys in GitHub.

---

## AI-assisted development (`.claude/`)

Lightweight setup that supports — never replaces — tests and review:

- **skills/architecture** — structure, DDD/clean/SOLID rules, boundaries, "how to
  add a feature".
- **skills/spec-workflow** — spec → plan → implement → test loop (`docs/specs/`).
- **agents/code-auditor** — reviews a diff for SOLID/DDD/test/redaction/boundary
  issues.
- **agents/test-author** — writes focused Jest tests.
- **[CLAUDE.md](CLAUDE.md)** — the working agreement (tests always, run via Nx,
  respect boundaries, keep the core runtime-agnostic).

---

## Adding a library

The repo is meant to grow by adding scoped libraries, not by fattening the apps.
(Detailed version: the `architecture` skill in `.claude/`.)

```bash
nx g @nx/js:lib payments --directory=libs/payments --unitTestRunner=jest --linter=eslint
```

Then:

1. **Tag it** in `libs/payments/package.json` → `"nx": { "tags": ["type:lib", "scope:payments"] }`.
   Tags drive the boundary rules.
2. **Boundaries** (`eslint.config.mjs`): reusing an existing scope needs nothing;
   a **new** scope gets a `depConstraints` entry (e.g. `scope:payments` may depend
   on `scope:payments` + `scope:shared`). To keep a server-only lib out of the
   browser app, tighten the app's scope constraints too.
3. **External deps** go in the lib's own `package.json` (`@nx/dependency-checks`
   enforces this).
4. **Design**: model integrations as a **port + adapter** — an interface in the
   `application` layer and the concrete implementation in `infrastructure`, wired
   at the app's composition root. This is the same Dependency Inversion as
   `Logger` ← `ObservabilityProvider` (e.g. `PaymentService` ← `PaymentGateway`,
   with a `StripeGateway` adapter). Keep secrets in env/config at the composition
   root, never in the lib.
5. **Tests always** (`*.spec.ts`, mock collaborators), then `nx sync` (updates TS
   project references) and `nx affected -t lint test build`.

**Library vs. secondary entry point.** For a new facet of an existing lib (e.g.
metrics/tracing for observability), prefer a secondary entry point
(`@org/observability/metrics` via the package `exports`) over a whole new library
— reserve a new lib for things with their own owner or heavy dependencies.

---

## Layout

```
apps/api               Express service · clean layering · Dockerfile (Lambda Web Adapter)
apps/web               Angular SPA · runtime config · Dockerfile (nginx)
libs/observability     shared provider-agnostic logging (the only shared lib)
infra/bootstrap        one-time AWS setup (ECR, OIDC, roles)
infra/ephemeral        per-PR AWS stack (Lambda + Function URL + S3 site)
.github/workflows      ci.yml (gate) · ephemeral.yml (deploy/teardown)
.claude/               skills + agents for AI-assisted development
docs/ADR.md            architecture decisions
docs/specs/            lightweight feature specs
```
