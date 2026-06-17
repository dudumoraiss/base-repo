import request from 'supertest';
import { buildServer } from './server.js';
import type { Logger } from '@org/observability';

const fakeLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    flush: jest.fn(),
  }) as unknown as Logger;

describe('GET /health', () => {
  it('responds 200 with { status: "ok", service: "api" }', async () => {
    const app = buildServer({ logger: fakeLogger(), serviceName: 'api' });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'api' });
  });

  it('logs the health check when the endpoint is hit', async () => {
    const logger = fakeLogger();
    const app = buildServer({ logger, serviceName: 'api' });

    await request(app).get('/health');

    expect(logger.info).toHaveBeenCalledWith('health check');
  });
});
