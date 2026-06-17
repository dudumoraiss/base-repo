import { DatadogProvider, type DatadogLog } from './datadog-provider.js';
import type { LogEntry } from '../log-entry.js';

const entry: LogEntry = {
  timestamp: '2026-06-16T12:00:00.000Z',
  level: 'info',
  message: 'health check',
  service: 'api',
  context: { route: '/health' },
};

describe('DatadogProvider', () => {
  it('buffers entries and ships them to the transport as a batch on flush', async () => {
    const shipped: DatadogLog[] = [];
    const provider = new DatadogProvider({
      tags: ['env:test'],
      transport: (payload) => {
        shipped.push(...payload);
      },
    });

    provider.log(entry);
    provider.log({ ...entry, message: 'second' });
    expect(shipped).toHaveLength(0); // nothing ships until flush

    await provider.flush();

    expect(shipped).toHaveLength(2);
    expect(shipped[0]).toMatchObject({
      service: 'api',
      status: 'info',
      message: 'health check',
      ddtags: 'env:test',
      route: '/health', // context is flattened into the datadog payload
    });
  });

  it('does not call the transport when the buffer is empty', async () => {
    const transport = jest.fn();
    await new DatadogProvider({ transport }).flush();
    expect(transport).not.toHaveBeenCalled();
  });

  it('clears the buffer after flushing', async () => {
    const transport = jest.fn();
    const provider = new DatadogProvider({ transport });

    provider.log(entry);
    await provider.flush();
    await provider.flush(); // nothing left to ship

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('is a safe no-op when no transport and no credentials are configured', async () => {
    const provider = new DatadogProvider();
    provider.log(entry);
    await expect(provider.flush()).resolves.toBeUndefined();
  });

  it('default transport POSTs to the Datadog intake when credentials are set', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true } as Response);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const provider = new DatadogProvider({
        apiKey: 'secret-key',
        site: 'datadoghq.eu',
      });
      provider.log(entry);
      await provider.flush();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://http-intake.logs.datadoghq.eu/api/v2/logs');
      expect(init.method).toBe('POST');
      expect(init.headers['DD-API-KEY']).toBe('secret-key');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
