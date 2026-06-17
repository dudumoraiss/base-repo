import { Logger } from './logger.js';
import { REDACTED } from './redaction.js';
import type { LogEntry, LogLevel } from './log-entry.js';
import type { ObservabilityProvider } from './provider.js';

class CapturingProvider implements ObservabilityProvider {
  readonly entries: LogEntry[] = [];
  log(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

const fixedClock = () => new Date('2026-06-16T12:00:00.000Z');

function makeLogger() {
  const provider = new CapturingProvider();
  const logger = new Logger({ service: 'api', provider, clock: fixedClock });
  return { provider, logger };
}

describe('Logger', () => {
  it('builds a structured entry with timestamp, level, service and message', () => {
    const { provider, logger } = makeLogger();

    logger.info('health check');

    expect(provider.entries[0]).toEqual({
      timestamp: '2026-06-16T12:00:00.000Z',
      level: 'info',
      message: 'health check',
      service: 'api',
    });
  });

  it.each<LogLevel>(['debug', 'info', 'warn', 'error'])(
    'emits at the %s level',
    (level) => {
      const { provider, logger } = makeLogger();
      logger[level]('msg');
      expect(provider.entries[0].level).toBe(level);
    },
  );

  it('redacts secrets in context before forwarding to the provider', () => {
    const { provider, logger } = makeLogger();

    logger.info('login attempt', { username: 'bob', password: 'hunter2' });

    expect(provider.entries[0].context).toEqual({
      username: 'bob',
      password: REDACTED,
    });
  });

  it('omits the context field entirely when none is supplied', () => {
    const { provider, logger } = makeLogger();
    logger.info('no context');
    expect('context' in provider.entries[0]).toBe(false);
  });

  it('delegates flush to the provider when supported', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const provider: ObservabilityProvider = { log: jest.fn(), flush };
    const logger = new Logger({ service: 'api', provider });

    await logger.flush();

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('does not throw when flushing a provider without flush support', async () => {
    const provider: ObservabilityProvider = { log: jest.fn() };
    const logger = new Logger({ service: 'api', provider });
    await expect(logger.flush()).resolves.toBeUndefined();
  });
});
