/**
 * @org/observability — provider-agnostic, runtime-agnostic structured logging.
 *
 * The public surface is intentionally small and free of any Node / DOM / Angular
 * / Express dependency, so `apps/api` (Node) and `apps/web` (browser) import the
 * exact same core. Environment-specific wiring lives in each app, not here.
 */

// Core contract
export type { LogLevel, LogEntry } from './lib/log-entry.js';
export type { ObservabilityProvider } from './lib/provider.js';

// Application-facing logger
export { Logger } from './lib/logger.js';
export type { LoggerOptions } from './lib/logger.js';

// Redaction (exported so it can be unit-tested and reused)
export { redact, DEFAULT_REDACT_KEYS, REDACTED } from './lib/redaction.js';

// Providers
export { ConsoleProvider } from './lib/providers/console-provider.js';
export type { ConsoleLike } from './lib/providers/console-provider.js';
export { NoopProvider } from './lib/providers/noop-provider.js';
export { DatadogProvider } from './lib/providers/datadog-provider.js';
export type {
  DatadogProviderOptions,
  DatadogLog,
  DatadogTransport,
} from './lib/providers/datadog-provider.js';

// Provider selection
export { createProvider, resolveProviderName } from './lib/provider-factory.js';
export type {
  ProviderName,
  CreateProviderOptions,
} from './lib/provider-factory.js';
