import type { LogEntry } from '../log-entry.js';
import type { ObservabilityProvider } from '../provider.js';

/** The shape Datadog's HTTP intake expects (subset). */
export interface DatadogLog {
  ddsource: string;
  service: string;
  status: LogEntry['level'];
  message: string;
  ddtags?: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * The transport seam: where a flushed batch actually goes. Injected so the
 * provider owns the *mapping + batching* but not the *network* (Dependency
 * Inversion). A real deployment injects an HTTP POST; tests inject a capturing
 * function. `fetch` is never hard-wired into the provider.
 */
export type DatadogTransport = (
  payload: DatadogLog[],
) => void | Promise<void>;

/** Configuration for the Datadog provider. */
export interface DatadogProviderOptions {
  /** Datadog API key. Read from config/secret manager by the application. */
  apiKey?: string;
  /** Datadog site, e.g. `datadoghq.com` or `datadoghq.eu`. */
  site?: string;
  /** Optional tags appended to every log (`env:prod`, `version:1.2.3`, ...). */
  tags?: string[];
  /**
   * Transport for flushed batches. If omitted, a default HTTP transport is used
   * when `apiKey` + `site` are set; otherwise flushing is a no-op (stub mode).
   */
  transport?: DatadogTransport;
}

/**
 * Cloud provider for Datadog. It buffers entries on the hot path and, on
 * {@link flush}, maps them to Datadog's intake shape and hands the batch to a
 * {@link DatadogTransport}. Buffer-and-flush (rather than per-call HTTP) keeps
 * the request path non-blocking and lets the app flush on shutdown / Lambda
 * freeze.
 *
 * Out of the box it is a safe stub: with no `transport` and no `apiKey`/`site`
 * it connects to nothing. Provide credentials (or your own transport) to make it
 * real — see {@link DatadogProvider.defaultTransport}.
 */
export class DatadogProvider implements ObservabilityProvider {
  private readonly buffer: LogEntry[] = [];

  constructor(private readonly options: DatadogProviderOptions = {}) {}

  log(entry: LogEntry): void {
    this.buffer.push(entry);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    const batch = this.buffer.splice(0, this.buffer.length);
    const payload = batch.map((entry) => this.toDatadog(entry));
    const transport = this.options.transport ?? this.defaultTransport();
    await transport(payload);
  }

  /**
   * Default transport: a real POST to Datadog's intake API when credentials are
   * present, else a no-op (so the provider stays a safe stub by default).
   * `fetch` is a cross-runtime global (Node ≥18 and browsers), so this keeps the
   * library runtime-agnostic.
   */
  private defaultTransport(): DatadogTransport {
    const { apiKey, site } = this.options;
    if (!apiKey || !site) {
      return () => undefined;
    }
    return async (payload) => {
      await fetch(`https://http-intake.logs.${site}/api/v2/logs`, {
        method: 'POST',
        headers: {
          'DD-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    };
  }

  private toDatadog(entry: LogEntry): DatadogLog {
    return {
      ddsource: 'nodejslib',
      service: entry.service,
      status: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      ddtags: this.options.tags?.join(','),
      ...entry.context,
    };
  }
}
