import {
  Logger,
  createProvider,
  resolveProviderName,
} from '@org/observability';

/**
 * Composition seam for observability. This is the ONLY place in the API that
 * knows a concrete provider exists. Selection is driven by configuration
 * (`OBSERVABILITY_PROVIDER`), so switching console -> datadog is an env change,
 * not a code change.
 */
export function createLogger(service: string): Logger {
  const provider = createProvider(
    resolveProviderName(process.env.OBSERVABILITY_PROVIDER),
    {
      datadog: {
        apiKey: process.env.DD_API_KEY,
        site: process.env.DD_SITE,
        tags: [`env:${process.env.ENV_NAME ?? 'local'}`],
      },
    },
  );

  return new Logger({ service, provider });
}
