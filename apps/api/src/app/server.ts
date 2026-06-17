import express, { type Express } from 'express';
import cors from 'cors';
import type { Logger } from '@org/observability';
import { HealthService } from './health/health.service.js';
import { healthController } from './health/health.controller.js';

export interface ServerDeps {
  logger: Logger;
  serviceName: string;
}

/**
 * Builds the Express application from its dependencies. Pure factory: no
 * `listen`, no `process.env` — which keeps it fully testable with supertest.
 *
 * CORS is enabled because in the ephemeral environment the web app (served from
 * an S3 origin) calls this API (a Lambda Function URL) cross-origin.
 */
export function buildServer({ logger, serviceName }: ServerDeps): Express {
  const app = express();
  app.use(cors());

  const health = new HealthService(logger, serviceName);
  app.get('/health', healthController(health));

  return app;
}
