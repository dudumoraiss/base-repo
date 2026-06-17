import type { LogEntry } from '../log-entry.js';
import type { ObservabilityProvider } from '../provider.js';

/**
 * Discards every entry. Useful in unit tests and in any context where logging
 * should be silenced without changing application code (just swap the provider).
 */
export class NoopProvider implements ObservabilityProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(_entry: LogEntry): void {
    // intentionally empty
  }
}
