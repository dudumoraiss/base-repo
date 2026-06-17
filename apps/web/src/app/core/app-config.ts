import { InjectionToken } from '@angular/core';

export type ObservabilityProviderName = 'console' | 'noop' | 'datadog';

/** Runtime configuration, loaded from `/config.json` at startup. */
export interface AppConfig {
  /** Base URL of the API (e.g. a per-PR Lambda Function URL). */
  apiUrl: string;
  /** Which observability provider the browser logger uses. */
  observabilityProvider: ObservabilityProviderName;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const DEFAULT_CONFIG: AppConfig = {
  apiUrl: 'http://localhost:3000',
  observabilityProvider: 'console',
};

/**
 * Loads runtime config from `/config.json`. This is what lets us build the SPA
 * exactly once and point it at any backend (each PR gets its own API URL) by
 * writing `config.json` at deploy time — no per-environment rebuild. Falls back
 * to {@link DEFAULT_CONFIG} if the file is missing or invalid.
 */
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`config.json responded ${response.status}`);
    }
    return { ...DEFAULT_CONFIG, ...(await response.json()) };
  } catch {
    return DEFAULT_CONFIG;
  }
}
