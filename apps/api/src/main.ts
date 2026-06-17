import { createLogger } from './app/observability.js';
import { buildServer } from './app/server.js';

/**
 * Composition root. The one place that reads the environment, picks the
 * observability provider, builds the server, and starts listening.
 */
const serviceName = 'api';
const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const logger = createLogger(serviceName);
const app = buildServer({ logger, serviceName });

app.listen(port, host, () => {
  logger.info('api started', { host, port });
});
