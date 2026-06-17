import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { APP_CONFIG, loadAppConfig } from './app/core/app-config';

// Load runtime config (API URL, provider) BEFORE bootstrapping, then provide it
// as a value. The SPA is built once and pointed at any backend via config.json.
loadAppConfig()
  .then((config) =>
    bootstrapApplication(App, {
      ...appConfig,
      providers: [
        { provide: APP_CONFIG, useValue: config },
        ...(appConfig.providers ?? []),
      ],
    }),
  )
  .catch((err) => console.error(err));
