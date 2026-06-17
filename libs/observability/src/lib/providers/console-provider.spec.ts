import { ConsoleProvider, type ConsoleLike } from './console-provider.js';
import type { LogEntry } from '../log-entry.js';

function fakeConsole(): jest.Mocked<ConsoleLike> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const entry: LogEntry = {
  timestamp: '2026-06-16T12:00:00.000Z',
  level: 'info',
  message: 'health check',
  service: 'api',
  context: { route: '/health' },
};

describe('ConsoleProvider', () => {
  it('formats the entry as a single line of JSON', () => {
    const out = fakeConsole();
    new ConsoleProvider(out).log(entry);
    expect(out.info).toHaveBeenCalledWith(JSON.stringify(entry));
  });

  it('routes each level to the matching console method', () => {
    const out = fakeConsole();
    const provider = new ConsoleProvider(out);

    provider.log({ ...entry, level: 'debug' });
    provider.log({ ...entry, level: 'info' });
    provider.log({ ...entry, level: 'warn' });
    provider.log({ ...entry, level: 'error' });

    expect(out.debug).toHaveBeenCalledTimes(1);
    expect(out.info).toHaveBeenCalledTimes(1);
    expect(out.warn).toHaveBeenCalledTimes(1);
    expect(out.error).toHaveBeenCalledTimes(1);
  });
});
