import type { Provider } from '@angular/core';
import { Logger, createProvider } from '@org/observability';
import { APP_CONFIG, type AppConfig } from './app-config';
import { LOGGER } from './logger.token';

/**
 * Angular DI wiring for @org/observability — the app-level "adapter".
 *
 * It builds a core `Logger` from runtime config and exposes it via the `LOGGER`
 * token, so components/services depend on the token, never on a concrete
 * provider. Swapping console -> datadog is a config change (`config.json`), not a
 * code change. The library itself stays framework-agnostic; this Angular glue
 * lives in the app, not in the lib.
 */
export function provideObservability(service: string): Provider {
  return {
    provide: LOGGER,
    useFactory: (config: AppConfig) =>
      new Logger({
        service,
        provider: createProvider(config.observabilityProvider),
      }),
    deps: [APP_CONFIG],
  };
}
