import type { LogEntry } from './log-entry.js';

/**
 * The single seam that lets the observability provider be swapped without
 * touching application code. A provider receives already-built, already-redacted
 * {@link LogEntry} values and is responsible only for transporting them.
 *
 * Keep this interface small on purpose: the smaller the contract, the cheaper it
 * is to implement a new provider (console, no-op, Datadog, Sentry, ...).
 */
export interface ObservabilityProvider {
  /** Transport a single entry (write to stdout, buffer for a cloud sink, ...). */
  log(entry: LogEntry): void;
  /**
   * Optionally flush any buffered entries. Synchronous providers (console,
   * no-op) omit it; batching cloud providers implement it.
   */
  flush?(): Promise<void>;
}
