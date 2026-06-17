import { InjectionToken } from '@angular/core';
import type { Logger } from '@org/observability';

/**
 * DI token for the shared structured logger. The import of `Logger` is
 * type-only, so this module pulls NO runtime code from @org/observability — that
 * keeps consumers (and their unit tests) decoupled from the concrete library.
 * The actual instance is built in `observability.providers.ts`.
 */
export const LOGGER = new InjectionToken<Logger>('LOGGER');
