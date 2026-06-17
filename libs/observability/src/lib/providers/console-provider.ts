import type { LogEntry } from '../log-entry.js';
import type { ObservabilityProvider } from '../provider.js';

/**
 * Minimal console contract. We depend on this abstraction rather than the global
 * `console` directly so the provider stays runtime-agnostic and trivially
 * testable (inject a fake in tests). `console` is the only sensible default and
 * exists identically in Node and the browser.
 */
export interface ConsoleLike {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Default provider: prints each entry as a single line of structured JSON,
 * routed to the console method matching its level (so warn/error reach stderr
 * in Node and the correct browser channel).
 */
export class ConsoleProvider implements ObservabilityProvider {
  constructor(private readonly out: ConsoleLike = console) {}

  log(entry: LogEntry): void {
    const line = JSON.stringify(entry);
    switch (entry.level) {
      case 'debug':
        this.out.debug(line);
        break;
      case 'info':
        this.out.info(line);
        break;
      case 'warn':
        this.out.warn(line);
        break;
      case 'error':
        this.out.error(line);
        break;
    }
  }
}
