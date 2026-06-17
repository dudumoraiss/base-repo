import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../core/app-config';
import { LOGGER } from '../core/logger.token';
import type { HealthResponse } from './health.model';

/**
 * Calls the backend health endpoint and logs the outcome via the shared logger
 * — a structured entry on success AND on failure.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly logger = inject(LOGGER);

  async check(): Promise<HealthResponse> {
    const url = `${this.config.apiUrl}/health`;
    try {
      const response = await firstValueFrom(this.http.get<HealthResponse>(url));
      this.logger.info('health check response', {
        status: response.status,
        service: response.service,
      });
      return response;
    } catch (error) {
      this.logger.error('health check failed', { url, error: String(error) });
      throw error;
    }
  }
}
