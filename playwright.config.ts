import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'off' },
  projects: [
    // The responsive suite sets its own viewport per case, so running it under
    // a device project would re-run every assertion at a width it was not
    // written for, and `iPhone 13` would additionally impose `isMobile`. It
    // gets one project of its own and is excluded from the other two.
    {
      name: 'desktop',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'responsive',
      testMatch: /responsive\.spec\.ts/,
      // Walking a long page to settle its reveals, at three widths, does not
      // fit the 30s default.
      timeout: 120_000,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 3100 --bind 127.0.0.1 --directory out',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
  },
});
