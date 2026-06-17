import { redact, REDACTED } from './redaction.js';

describe('redact', () => {
  it('masks every key on the default denylist', () => {
    const out = redact({
      password: 'p',
      token: 't',
      secret: 's',
      authorization: 'a',
      key: 'k',
      username: 'bob',
    });

    expect(out).toEqual({
      password: REDACTED,
      token: REDACTED,
      secret: REDACTED,
      authorization: REDACTED,
      key: REDACTED,
      username: 'bob',
    });
  });

  it('matches case-insensitively and as a substring', () => {
    const out = redact({
      apiKey: 'x',
      Access_Token: 'y',
      'X-Authorization': 'z',
      PASSWORD: 'w',
    });

    expect(out.apiKey).toBe(REDACTED);
    expect(out.Access_Token).toBe(REDACTED);
    expect(out['X-Authorization']).toBe(REDACTED);
    expect(out.PASSWORD).toBe(REDACTED);
  });

  it('redacts nested objects and arrays', () => {
    const out = redact({
      user: { name: 'bob', password: 'p' },
      sessions: [{ token: 't1' }, { token: 't2' }],
    });

    expect(out.user).toEqual({ name: 'bob', password: REDACTED });
    expect(out.sessions).toEqual([{ token: REDACTED }, { token: REDACTED }]);
  });

  it('does not mutate the input object', () => {
    const input = { password: 'super-secret' };
    redact(input);
    expect(input.password).toBe('super-secret');
  });

  it('handles circular references without throwing', () => {
    const node: Record<string, unknown> = { name: 'root' };
    node['self'] = node;
    expect(() => redact(node)).not.toThrow();
  });

  it('honours a custom denylist', () => {
    const out = redact({ ssn: '111-22-3333', name: 'bob' }, ['ssn']);
    expect(out.ssn).toBe(REDACTED);
    expect(out.name).toBe('bob');
  });

  it('leaves primitives untouched', () => {
    expect(redact(42)).toBe(42);
    expect(redact('hello')).toBe('hello');
    expect(redact(null)).toBeNull();
  });
});
