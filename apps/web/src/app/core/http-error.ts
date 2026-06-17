import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an unknown thrown value into a readable string. Angular throws an
 * `HttpErrorResponse` (an object), so `String(error)` would yield
 * `"[object Object]"` — this extracts something meaningful instead.
 */
export function describeHttpError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // status 0 == the request never completed (backend down, DNS, CORS, TLS).
    if (error.status === 0) {
      return 'Network error — backend unreachable';
    }
    return `${error.status} ${error.statusText || 'Error'}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}
