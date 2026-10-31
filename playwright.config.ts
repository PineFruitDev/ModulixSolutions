import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'python3 -m http.server 3100 --bind 127.0.0.1 --directory out',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
  },
});
