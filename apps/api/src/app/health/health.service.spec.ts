import { HealthService } from './health.service.js';
import type { Logger } from '@org/observability';

function fakeLogger(): jest.Mocked<Logger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    flush: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
}

describe('HealthService', () => {
  it('returns ok with the configured service name', () => {
    const service = new HealthService(fakeLogger(), 'api');
    expect(service.check()).toEqual({ status: 'ok', service: 'api' });
  });

  it('logs a single "health check" info entry', () => {
    const logger = fakeLogger();
    new HealthService(logger, 'api').check();

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('health check');
  });
});
