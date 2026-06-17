import type { Request, Response } from 'express';
import type { HealthService } from './health.service.js';

/**
 * HTTP adapter for the health endpoint. Translates an Express request into a
 * call on the application service and serialises the result. No business logic
 * lives here.
 */
export function healthController(service: HealthService) {
  return (_req: Request, res: Response): void => {
    res.json(service.check());
  };
}
