import { createProvider, resolveProviderName } from './provider-factory.js';
import { ConsoleProvider } from './providers/console-provider.js';
import { NoopProvider } from './providers/noop-provider.js';
import { DatadogProvider } from './providers/datadog-provider.js';
import { Logger } from './logger.js';
import type { LogEntry } from './log-entry.js';

describe('createProvider', () => {
  it('creates the requested provider instance', () => {
    expect(createProvider('console')).toBeInstanceOf(ConsoleProvider);
    expect(createProvider('noop')).toBeInstanceOf(NoopProvider);
    expect(createProvider('datadog')).toBeInstanceOf(DatadogProvider);
  });

  it('forwards datadog options', async () => {
    const transport = jest.fn();
    const provider = createProvider('datadog', { datadog: { transport } });
    provider.log({
      timestamp: '2026-06-16T12:00:00.000Z',
      level: 'info',
      message: 'm',
      service: 'api',
    });
    await provider.flush?.();
    expect(transport).toHaveBeenCalledTimes(1);
  });
});

describe('resolveProviderName', () => {
  it('defaults to console for unknown / empty input', () => {
    expect(resolveProviderName(undefined)).toBe('console');
    expect(resolveProviderName('')).toBe('console');
    expect(resolveProviderName('bogus')).toBe('console');
  });

  it('resolves known names case-insensitively', () => {
    expect(resolveProviderName('NOOP')).toBe('noop');
    expect(resolveProviderName('Datadog')).toBe('datadog');
  });
});

describe('provider swap', () => {
  // Proves the core promise: swapping the provider changes ONLY transport.
  // The Logger builds the identical entry regardless of which provider is wired.
  it('produces an identical entry across providers', () => {
    const captured: Record<string, LogEntry> = {};
    const capture = (name: string) => ({
      log: (entry: LogEntry) => {
        captured[name] = entry;
      },
    });

    const clock = () => new Date('2026-06-16T12:00:00.000Z');
    new Logger({ service: 'api', provider: capture('a'), clock }).info('hi', {
      ok: true,
    });
    new Logger({ service: 'api', provider: capture('b'), clock }).info('hi', {
      ok: true,
    });

    expect(captured['a']).toEqual(captured['b']);
  });
});
