/**
 * Runtime-agnostic log primitives.
 *
 * This file intentionally has ZERO dependencies on Node, the DOM, Angular or
 * Express. It is the stable contract shared by every app and every provider.
 */

/** Severity of a log entry, ordered from least to most severe. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single structured log record. This is the only shape that crosses the
 * boundary between an application and an {@link ObservabilityProvider}.
 */
export interface LogEntry {
  /** ISO 8601 timestamp, e.g. `2026-06-16T12:00:00.000Z`. */
  timestamp: string;
  /** Severity level. */
  level: LogLevel;
  /** Human-readable message. */
  message: string;
  /** Name of the emitting service, fixed at logger construction time. */
  service: string;
  /** Optional structured metadata. Redacted before it reaches a provider. */
  context?: Record<string, unknown>;
}
