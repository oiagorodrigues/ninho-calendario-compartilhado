import { defineConfig, devices } from '@playwright/test';

const PORT = 8790;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `rm -f ./data/e2e.db* && pnpm build && NINHO_DB=./data/e2e.db NINHO_AUTH_ATTEMPT_LIMIT=1000 NINHO_PORT=${PORT} NINHO_PUBLIC_URL=http://localhost:${PORT} pnpm start`,
    url: `http://localhost:${PORT}/api/me`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
  },
});
