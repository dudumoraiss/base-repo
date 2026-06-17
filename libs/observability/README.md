# @org/observability

Provider-agnostic, **runtime-agnostic** structured logging shared by every app in
the monorepo (`apps/api` on Node, `apps/web` in the browser). The same core is
imported by both — it is never copied.

## Why it exists

Applications should describe *what* happened (`logger.info('health check')`)
without knowing *where* logs go (stdout, Datadog, /dev/null). This library owns
that policy so the observability backend can be swapped with zero application
changes.

## Design

```
LogEntry            the only shape that crosses the app <-> provider boundary
ObservabilityProvider   one method: log(entry) (+ optional flush)  <-- the swap seam
Logger              app-facing API: builds the entry, redacts secrets, forwards
redact()            centralised secret masking, applied by the Logger
providers/          Console (default) · Noop (tests) · Datadog (cloud stub)
createProvider()    name -> provider instance (the only place that knows them all)
```

Key properties:

- **Runtime-agnostic core** — zero dependencies on Node, Express, Angular, or DOM
  APIs. The console provider depends only on an injectable `ConsoleLike` (default
  `console`, which exists identically in Node and the browser).
- **Dependency Inversion** — `Logger` depends on the `ObservabilityProvider`
  abstraction, never a concrete sink.
- **Secrets never leak** — redaction is applied centrally in `Logger`, so no
  provider can ever receive a raw secret.

## Log entry shape

Every entry contains:

| Field       | Notes                                              |
| ----------- | -------------------------------------------------- |
| `timestamp` | ISO 8601, e.g. `2026-06-16T12:00:00.000Z`          |
| `level`     | `debug` \| `info` \| `warn` \| `error`             |
| `message`   | the log message                                    |
| `service`   | emitting service, fixed at logger construction     |
| `context?`  | optional structured metadata (redacted before use) |

The console provider serialises each entry as one line of JSON.

## Redaction

Any context key whose name **contains** (case-insensitive) one of the denylist
words is replaced with `[REDACTED]`:

```
password · token · secret · authorization · key
```

Matching is substring-based, so `apiKey`, `access_token`, and `X-Authorization`
are all caught. Redaction is deep (nested objects + arrays), never mutates the
input, and is safe against circular references. Override per logger via
`redactKeys`.

## Usage

```ts
import { Logger, ConsoleProvider } from '@org/observability';

const logger = new Logger({
  service: 'api',
  provider: new ConsoleProvider(),
});

logger.info('health check'); // {"timestamp":"...","level":"info","message":"health check","service":"api"}
logger.warn('login failed', { user: 'bob', password: 'hunter2' });
// context.password -> "[REDACTED]"
```

### Selecting a provider from configuration

```ts
import { Logger, createProvider, resolveProviderName } from '@org/observability';

const provider = createProvider(
  resolveProviderName(process.env.OBSERVABILITY_PROVIDER), // "console" | "noop" | "datadog"
);
const logger = new Logger({ service: 'api', provider });
```

`resolveProviderName` defaults unknown/empty input to `console`, keeping the core
free of any `process.env` dependency (the app passes the raw value in).

## Swapping to a cloud provider

The `DatadogProvider` buffers entries and, on `flush()`, maps them to Datadog's
intake shape and hands the batch to an injected `DatadogTransport` (the seam that
owns the network). With no transport and no credentials it's a safe **stub** that
connects to nothing; provide `apiKey` + `site` (or your own `transport`) and the
default transport `POST`s to `https://http-intake.logs.<site>/api/v2/logs` with
the `DD-API-KEY` header — see
[datadog-provider.ts](src/lib/providers/datadog-provider.ts). Buffer + flush is
deliberate: it keeps the request hot-path non-blocking and lets the app flush on
shutdown / Lambda freeze.

To add another backend (e.g. Sentry), implement `ObservabilityProvider` and add
it to `createProvider` — no application code changes.

## Commands

```bash
nx test @org/observability    # Jest unit tests (redaction, formatting, provider swap)
nx build @org/observability   # tsc build -> dist with type declarations
nx lint @org/observability
```

## What is intentionally left out

No log levels filtering/sampling, no transports for files/HTTP in core, no
correlation-ID propagation, no metrics/traces. The interface is kept minimal so
new providers are cheap; these concerns belong in providers or a future
`@org/observability/*` secondary entry point. See [docs/ADR.md](../../docs/ADR.md).
