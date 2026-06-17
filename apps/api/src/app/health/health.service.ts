import type { Logger } from '@org/observability';

/** Domain shape returned by the health endpoint. */
export interface HealthStatus {
  status: 'ok';
  service: string;
}

/**
 * Application service for health checks.
 *
 * It depends on the `Logger` *abstraction* (Dependency Inversion), never on a
 * concrete provider or on Express — so it stays unit-testable and transport-free.
 *
 * Note: injecting the logger here is a deliberate simplicity choice for a trivial
 * single-endpoint example. If observability logic grew (timing, success/failure,
 * many endpoints) we'd lift it out as a decorator or request-logging middleware
 * to keep the service single-responsibility. See docs/ADR.md.
 */
export class HealthService {
  constructor(
    private readonly logger: Logger,
    private readonly serviceName: string,
  ) {}

  check(): HealthStatus {
    this.logger.info('health check');
    return { status: 'ok', service: this.serviceName };
  }
}
