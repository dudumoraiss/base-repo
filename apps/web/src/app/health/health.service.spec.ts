import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HealthService } from './health.service';
import { APP_CONFIG } from '../core/app-config';
import { LOGGER } from '../core/logger.token';

describe('HealthService', () => {
  const apiUrl = 'http://api.test';
  let service: HealthService;
  let httpMock: HttpTestingController;
  let logger: { info: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { apiUrl, observabilityProvider: 'noop' },
        },
        { provide: LOGGER, useValue: logger },
      ],
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('logs an info entry with the structured response on success', async () => {
    const promise = service.check();

    const req = httpMock.expectOne(`${apiUrl}/health`);
    req.flush({ status: 'ok', service: 'api' });
    await promise;

    expect(logger.info).toHaveBeenCalledWith('health check response', {
      status: 'ok',
      service: 'api',
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an error entry when the call fails', async () => {
    const promise = service.check();

    const req = httpMock.expectOne(`${apiUrl}/health`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeDefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toBe('health check failed');
  });
});
