import { Component, computed, inject, signal } from '@angular/core';
import { HealthService } from './health/health.service';
import type { HealthResponse } from './health/health.model';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'live'; data: HealthResponse }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly health = inject(HealthService);

  protected readonly state = signal<HealthState>({ kind: 'loading' });

  protected readonly liveData = computed(() => {
    const current = this.state();
    return current.kind === 'live' ? current.data : null;
  });

  protected readonly errorMessage = computed(() => {
    const current = this.state();
    return current.kind === 'error' ? current.message : '';
  });

  protected readonly isLoading = computed(() => this.state().kind === 'loading');

  constructor() {
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.state.set({ kind: 'loading' });
    try {
      const data = await this.health.check();
      this.state.set({ kind: 'live', data });
    } catch (error) {
      this.state.set({ kind: 'error', message: String(error) });
    }
  }
}
