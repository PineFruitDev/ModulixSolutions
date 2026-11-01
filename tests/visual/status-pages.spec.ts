import { test, expect } from '@playwright/test';

import { openStablePage } from './stabilize';

/**
 * The three utility pages, each short enough to photograph whole.
 *
 * These are the pages nobody looks at on a phone until the day they matter, so
 * a `fullPage` baseline per width is both affordable and the only check that
 * the single-column fallback still holds together.
 *
 * 404 is requested at the flat path for the same reason the smoke suite does:
 * the local static server does not emulate the hosting fallback, and
 * `/404.html` is the only 404 GitHub Pages serves anyway. `trailingSlash`
 * exports the others as directory indexes.
 */
const statusPages = [
  { path: '/contact-confirmed/', name: 'contact-confirmed' },
  { path: '/404.html', name: '404' },
  { path: '/500/', name: '500' },
];

for (const { path, name } of statusPages) {
  test(`${path} renders`, async ({ page }) => {
    await openStablePage(page, path);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
