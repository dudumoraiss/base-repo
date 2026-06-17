# 0001 — Shared observability library

- **Status:** done
- **Date:** 2026-06-16
- **Project(s):** libs/observability (consumed by apps/api, apps/web)

## Problem

Both apps need structured logging, but the observability backend should be
swappable (console today, a cloud sink tomorrow) without touching application
code, and the library must never leak secrets. A single shared library — not
copied code — must serve a Node app and a browser app from the same core.

## Scope

**In:** runtime-agnostic core (`LogEntry`, `ObservabilityProvider`, `Logger`),
centralised secret redaction, Console/Noop/Datadog providers, a config-driven
provider factory, and unit tests.

**Out:** real network transport for the cloud provider (stub only), log
sampling/filtering, correlation IDs, metrics/traces, file transports.

## Contract / interface

```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogEntry { timestamp: string; level: LogLevel; message: string; service: string; context?: Record<string, unknown>; }
interface ObservabilityProvider { log(entry: LogEntry): void; flush?(): Promise<void>; }
class Logger { constructor(o: { service: string; provider: ObservabilityProvider; redactKeys?: readonly string[]; clock?: () => Date }); debug/info/warn/error(message, context?); flush(); }
createProvider(name: 'console'|'noop'|'datadog', opts?): ObservabilityProvider;
resolveProviderName(value: string | undefined): ProviderName; // defaults to 'console'
```

## Acceptance criteria

- [x] Core has zero imports of Node/Express/Angular/DOM APIs.
- [x] Every entry carries ISO `timestamp`, `level`, `message`, `service`; optional
      `context`.
- [x] Console provider prints one line of JSON, routed to the matching console
      method by level.
- [x] Redaction masks any context key containing `password|token|secret|
      authorization|key` (case-insensitive), deep through objects/arrays, without
      mutating the input, and is circular-safe.
- [x] Swapping the provider changes only transport — the `Logger` builds an
      identical entry. Proven by a test.
- [x] Datadog stub buffers and ships a mapped batch on `flush()`.

## Notes

Angular DI glue and the Express composition root live in the apps, keeping the
lib framework-free. The Datadog provider's `DatadogTransport` seam owns the
network: with no credentials it's a stub; with `apiKey` + `site` the default
transport POSTs to the intake API (see the provider's class doc and ADR §3).
