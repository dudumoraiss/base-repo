# Architecture Decision Record

Context: a Platform-team challenge — a monorepo with two apps, one shared
observability library, and per-PR ephemeral environments. Throughout, two choices
are kept deliberately separate: the **observability provider** (where logs go) and
the **hosting provider** (where the apps run). They are unrelated and justified
independently below.

---

## 1. Monorepo structure

**Tooling: Nx.** The challenge is fundamentally about *shared capabilities and
boundaries*, which is exactly Nx's strength. It gives a project graph,
`affected`-based task running, caching, consistent generators, enforced module boundarie, etc... Projects are tagged
(`type:app` / `type:lib` plus a `scope:*`) and `@nx/enforce-module-boundaries`
turns those tags into lint rules: `type:lib` may depend only on `type:lib`, so
`libs/observability` *cannot* import an app. That is a mechanical guarantee, not a
convention, and it's verified in CI.

**Structure.** `apps/*` are deployable leaves; `libs/*` are shared building blocks.
the layout (`libs/<scope>/<name>`) is ready to grow without reshuffling.


**Testing & lint.** One runner — **Jest** via Nx — for one mental model across the
Node lib, the Express API, and the Angular app. ESLint (with the Nx + Angular
plugins) + Prettier, all run as Nx targets, with the boundary rule layered on top.

**AI-assisted development.** A lightweight `.claude/` setup encodes the same rules
the ADR describes so any contributor (human or agent) stays consistent: an
`architecture` skill (structure + DDD/SOLID + "how to add a feature"), a
`spec-workflow` skill (spec → plan → implement → test under `docs/specs/`), a
`code-auditor` agent (reviews diffs for SOLID/DDD/test/redaction/boundary issues),
and a `test-author` agent. It exists to *support* tests and review, never replace
them — `CLAUDE.md` makes "tests always" and "respect boundaries" explicit.

**At 10 teams.** Keep apps thin and push shared logic into scoped libraries
(`scope:payments`, `scope:observability`, …). Extend `depConstraints` so a team's
scope can only depend on shared/platform scopes, codifying ownership in lint. Add
`CODEOWNERS` per scope, turn on Nx Cloud (remote cache + distributed task
execution) so CI stays fast, and split libraries by *type* (feature / data-access /
ui / util) so boundaries express both ownership and layering. The shared
primitives (like observability) become a small platform-owned set every team
consumes but no team forks.

---

## 2. Observability library design

**Core interface.** Three small pieces cross the app↔library boundary:

```ts
interface LogEntry { timestamp; level; message; service; context? }
interface ObservabilityProvider { log(entry): void; flush?(): Promise<void> }
class Logger { debug/info/warn/error(message, context?); flush() }
```

`Logger` owns *policy* — stamp `service` + ISO `timestamp`, redact secrets, build
the entry — and delegates *transport* to an injected `ObservabilityProvider`
(Dependency Inversion). Applications only ever call `logger.info(...)`; they never
know which provider is wired in.

**Why this shape.** The provider interface is intentionally one method (+ optional
`flush`). The smaller the contract, the cheaper a new provider is, and the less
there is to break when swapping. Redaction lives in `Logger`, not in providers, so
no provider can ever receive a raw secret — security is a property of the core,
not of each integration. A `clock` seam is injectable so tests are deterministic.

**Runtime-agnostic.** Nothing in the core imports Node, Express, Angular, or DOM
APIs; the console provider depends on an injectable `ConsoleLike` (default the
universal `console`). Framework glue — Angular's DI token/factory, the Express
composition root — lives in the **apps**, so the lib stays framework-free (and the
boundary lint keeps it that way).

**What I left out, and why.** No level filtering/sampling, no correlation-ID
propagation, no metrics/traces, no file/HTTP transports in the core. These are
either provider concerns (a cloud provider can sample/ship) or future secondary
entry points (`@org/observability/metrics`). Keeping them out preserves the stable,
tiny core that makes provider-swapping safe. Redaction matches keys by
*substring*, case-insensitive (so `apiKey`, `access_token`, `X-Authorization` are
caught) — a deliberate bias toward over-redaction over leaking.

**A note on where logging lives.**
For `apps/api` the logger is injected into `HealthService`. Logging is a
cross-cutting concern, so the purer options are a **decorator** (wrap the service
with a `LoggingHealthService` of the same interface) or **request-logging
middleware**. Both keep the service single-responsibility. For a single `/health`
endpoint, however, those add ceremony with no payoff — that would be
over-engineering for now. Promote to a decorator/middleware the moment logging 
logic repeats or grows across endpoints.

---

## 3. Observability provider switching

A consumer never edits log calls to change backend — they change **configuration**:

- **`apps/api` (Node):** `createProvider(resolveProviderName(process.env.OBSERVABILITY_PROVIDER))`
  in the composition root. Set `OBSERVABILITY_PROVIDER=datadog` (plus
  `DD_API_KEY`) and every `logger.info(...)` already in the code now ships to
  Datadog. The application code is untouched.
- **`apps/web` (browser):** the provider name comes from `config.json` and the
  `provideObservability()` DI factory builds the `Logger`. Changing the JSON value
  re-points logging with no rebuild.

**What changes:** one config value (and the secret for a real cloud sink).
**What doesn't:** every call site, the `Logger`, redaction, the `LogEntry` shape,
and tests. There's even a test asserting two providers produce an *identical*
entry — proof that swapping is transport-only.

**Making the Datadog stub real.** `DatadogProvider` buffers entries and, on
`flush()`, maps them to Datadog's intake shape and hands the batch to an injected
`DatadogTransport` (the seam that owns the network — so the provider stays
decoupled from any HTTP client, Dependency Inversion). With no transport and no
credentials it connects to nothing; supply `apiKey` + `site` and the default
transport `POST`s to `https://http-intake.logs.<site>/api/v2/logs` with the
`DD-API-KEY` header, and the app calls `logger.flush()` on shutdown / Lambda
freeze. Buffer-and-flush (rather than per-call HTTP) keeps the request hot-path
non-blocking. The same
recipe adds a Sentry/OTLP provider — implement the one-method interface, register
it in `createProvider`.

---

## 4. Hosting provider choice & ephemeral lifecycle

**Choice: AWS — API as a Lambda container image behind a public Function URL;
frontend as static files on a public S3 website.** Provisioned per-PR with
Terraform; CI authenticates via GitHub **OIDC** (no stored AWS keys).

**Why, and the trade-off vs ECS.** The brief invited any provider; AWS was chosen
to demonstrate platform/IaC depth on the account provided. Within AWS the real
decision was **Lambda+S3 vs ECS Fargate+ALB**:

- *Lambda + Function URL + S3* — **no idle cost** (nothing runs between requests),
  fast create/destroy, public HTTPS for the API and a public HTTP URL for the
  static site with **no domain or ACM certificate** required. Ideal for cheap,
  isolated, throwaway environments on a fresh account.
- *ECS Fargate + ALB* — closer to a "real cluster", but an ALB bills ~$16/mo,
  create/destroy is slower, and clean public URLs really want a domain + cert. A
  forgotten environment keeps costing money.

The cost: Lambda **cold starts** (acceptable for a health demo) and Express-on-
Lambda via the Web Adapter (one image runs locally *and* on Lambda unchanged).
The S3 website endpoint is **HTTP** while the Function URL is **HTTPS** — browsers
allow an HTTPS fetch from an HTTP page, so this works. CloudFront would give the
frontend HTTPS but its ~15–20 min create/destroy is too slow per-PR; it's the
documented production upgrade.

**How the three constraints are met.** *Public* — Function URL `authorization_type
= NONE` plus BOTH resource-based grants the AWS console adds
(`lambda:InvokeFunctionUrl` to reach the URL **and** `lambda:InvokeFunction` to
invoke through it — with only one you get 403), and a public-read S3 bucket policy.
*PR-isolated* — every resource is suffixed with the PR number and each PR has its
own Terraform state key (`ephemeral/pr-<n>`), so two open PRs share nothing.
*Cleaned up* — on close, `terraform destroy` removes the stack (`force_destroy`
empties the bucket); no orphans.

**Failure modes (and mitigations).**

- *Cancelled run mid-apply / stuck state* — `concurrency: cancel-in-progress:
  false` avoids killing an apply/destroy. State has no DynamoDB lock here (single
  state bucket, per-PR keys); at scale I'd add native S3 lockfiles (TF ≥ 1.10) or a
  lock table.
- *Lambda cold start losing the health race* — the workflow polls `/health` and
  `web` for up to ~4 min before declaring success.
- *Teardown skipped* (e.g. a closed-event run fails) — orphans would accrue. A
  scheduled "reaper" that destroys stacks for already-closed PRs is the standard
  backstop.
- *ECR image churn* — a lifecycle policy expires untagged images.
- *Public Function URL is fiddly* — it needs two resource-policy grants (above);
  a single grant returns 403 `AccessDenied`, which the browser surfaces as a
  misleading CORS error (error responses carry no CORS headers). The two
  `aws_lambda_permission` resources mutate the same policy, so they're serialised
  with `depends_on` to avoid a provider read-back hang on parallel creation. The
  container image must be `linux/amd64` to match the function's architecture.
- *Mixed HTTP/HTTPS / CORS* — the S3 site is HTTP and the API HTTPS; a browser
  allows an HTTPS fetch from an HTTP page (mixed-content blocks only the reverse).
  CORS is owned by the Express app in ONE place: configuring it on both the app
  and the Function URL returns duplicate `Access-Control-Allow-Origin` headers,
  which the browser rejects.

**To make this the standard pipeline for a team of 20.** Add the reaper + a TTL so
stale PRs are reclaimed; put CloudFront (HTTPS, custom subdomain `pr-123.dev…`) in
front of the frontend; lock CORS to the known frontend origin; add a Terraform
`plan` comment on PRs and require it to be clean; add smoke/e2e tests against
the live ephemeral URL as a required check; and tighten the deploy IAM policy to
the minimum the workflow proves it needs. The shared library, the boundary rules,
and this ephemeral pattern then become a platform capability every product team
consumes unchanged.
