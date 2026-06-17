import type { LogEntry, LogLevel } from './log-entry.js';
import type { ObservabilityProvider } from './provider.js';
import { DEFAULT_REDACT_KEYS, redact } from './redaction.js';

/** Construction options for a {@link Logger}. */
export interface LoggerOptions {
  /** Name of the emitting service, stamped onto every entry. */
  service: string;
  /** Where entries are sent. Swap this to change observability backend. */
  provider: ObservabilityProvider;
  /** Override the default secret denylist. */
  redactKeys?: readonly string[];
  /** Clock seam for deterministic tests. Defaults to the system clock. */
  clock?: () => Date;
}

/**
 * The application-facing API. The {@link Logger} owns the *policy* (build the
 * entry, stamp service + timestamp, redact secrets) and delegates *transport*
 * to an injected {@link ObservabilityProvider} (Dependency Inversion).
 *
 * Application code only ever calls `logger.info(...)` etc. — it never knows or
 * cares which provider is wired in.
 */
export class Logger {
  private readonly service: string;
  private readonly provider: ObservabilityProvider;
  private readonly redactKeys: readonly string[];
  private readonly clock: () => Date;

  constructor(options: LoggerOptions) {
    this.service = options.service;
    this.provider = options.provider;
    this.redactKeys = options.redactKeys ?? DEFAULT_REDACT_KEYS;
    this.clock = options.clock ?? (() => new Date());
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.emit('error', message, context);
  }

  /** Flush the underlying provider, if it buffers (e.g. a cloud sink). */
  async flush(): Promise<void> {
    await this.provider.flush?.();
  }

  private emit(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      timestamp: this.clock().toISOString(),
      level,
      message,
      service: this.service,
    };
    if (context !== undefined) {
      entry.context = redact(context, this.redactKeys);
    }
    this.provider.log(entry);
  }
}
