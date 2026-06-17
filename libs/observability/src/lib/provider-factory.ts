import type { ObservabilityProvider } from './provider.js';
import { ConsoleProvider } from './providers/console-provider.js';
import { NoopProvider } from './providers/noop-provider.js';
import {
  DatadogProvider,
  type DatadogProviderOptions,
} from './providers/datadog-provider.js';

/** Names a consumer can use to select a provider via configuration. */
export type ProviderName = 'console' | 'noop' | 'datadog';

/** Options forwarded to the provider being created. */
export interface CreateProviderOptions {
  datadog?: DatadogProviderOptions;
}

/**
 * Factory that maps a provider name to a concrete instance. This is the one
 * place that knows about every provider; application code stays decoupled.
 */
export function createProvider(
  name: ProviderName,
  options: CreateProviderOptions = {},
): ObservabilityProvider {
  switch (name) {
    case 'noop':
      return new NoopProvider();
    case 'datadog':
      return new DatadogProvider(options.datadog);
    case 'console':
      return new ConsoleProvider();
    default: {
      // Exhaustiveness guard: a new ProviderName must be handled above.
      const exhaustive: never = name;
      throw new Error(`Unknown observability provider: ${String(exhaustive)}`);
    }
  }
}

/**
 * Resolve an untrusted string (e.g. an env var) into a valid {@link ProviderName},
 * defaulting to `console`. Kept separate from {@link createProvider} so the core
 * never reads `process.env` itself (Node-free) — the app passes the raw value in.
 */
export function resolveProviderName(value: string | undefined): ProviderName {
  switch ((value ?? '').toLowerCase()) {
    case 'noop':
      return 'noop';
    case 'datadog':
      return 'datadog';
    case 'console':
    case '':
      return 'console';
    default:
      return 'console';
  }
}
