import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Fail closed: no external traffic, including accidental real form submissions.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

test('homepage renders key sections and contact form', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Modulix/i);
  for (const id of ['hero', 'about', 'services', 'contact', 'faq']) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.getByRole('button', { name: 'Send Message' })).toBeDisabled();
});

test('valid inquiry submits once and reaches confirmation', async ({ page }) => {
  let submissions = 0;
  await page.route('https://api.web3forms.com/submit', async route => {
    submissions++;
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: { success: true } });
  });
  await page.goto('/');
  await page.getByLabel('Name *', { exact: true }).fill('Smoke Tester');
  await page.getByLabel('Email *', { exact: true }).fill('smoke@example.com');
  await page.getByLabel('Message *', { exact: true }).fill('Synthetic test inquiry only.');
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page).toHaveURL(/\/contact-confirmed\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("We'll Contact You Soon");
  expect(submissions).toBe(1);
});

for (const [path, heading] of [['/contact-confirmed/', "We'll Contact You Soon"], ['/404.html', '404 Error - Page Not Found']]) {
  test(`${path} renders and returns home`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    await page.getByRole('button', { name: 'Return to Homepage' }).click();
    await expect(page).toHaveURL('/');
  });
}
