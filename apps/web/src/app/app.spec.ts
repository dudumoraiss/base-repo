import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { HealthService } from './health/health.service';

function configure(check: jest.Mock) {
  return TestBed.configureTestingModule({
    imports: [App],
    providers: [{ provide: HealthService, useValue: { check } }],
  }).compileComponents();
}

describe('App', () => {
  it('shows "Backend service is live" when the API responds', async () => {
    const check = jest.fn().mockResolvedValue({ status: 'ok', service: 'api' });
    await configure(check);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Backend service is live');
    expect(text).toContain('api');
  });

  it('shows an error state when the API call fails', async () => {
    const check = jest.fn().mockRejectedValue(new Error('boom'));
    await configure(check);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Backend unreachable');
  });
});
