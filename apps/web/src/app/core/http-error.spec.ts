import { HttpErrorResponse } from '@angular/common/http';
import { describeHttpError } from './http-error';

describe('describeHttpError', () => {
  it('maps a network failure (status 0) to a friendly message', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    expect(describeHttpError(error)).toBe('Network error — backend unreachable');
  });

  it('formats an HTTP error as status + statusText', () => {
    const error = new HttpErrorResponse({
      status: 503,
      statusText: 'Service Unavailable',
    });
    expect(describeHttpError(error)).toBe('503 Service Unavailable');
  });

  it('uses Error.message for plain errors', () => {
    expect(describeHttpError(new Error('boom'))).toBe('boom');
  });

  it('passes strings through', () => {
    expect(describeHttpError('nope')).toBe('nope');
  });

  it('never returns "[object Object]"', () => {
    expect(describeHttpError({ weird: true })).not.toBe('[object Object]');
  });
});
