import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Fail closed: no external traffic.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

test('the skip link is the first tab stop and jumps to main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test.describe('desktop in-page navigation', () => {
  // The primary nav is hidden below md, so pin a desktop viewport for both
  // projects rather than relying on the one each happens to use.
  test.use({ viewport: { width: 1280, height: 720 } });

  /**
   * Distance between the top of the section and the bottom of the fixed bar.
   * Zero once the hand-written animation has settled.
   */
  const clearance = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
      const bar = document.querySelector('.site-header') as HTMLElement;
      const section = document.querySelector('#services') as HTMLElement;
      return Math.round(
        Math.abs(section.getBoundingClientRect().top - bar.getBoundingClientRect().bottom)
      );
    });

  // The animation advances on requestAnimationFrame, which a headless browser
  // throttles hard (frames hundreds of milliseconds apart), so this polls for
  // the settled state rather than guessing a duration. It settles at 24 rather
  // than 0 because the section's reveal keeps a 24px vertical transform that
  // getBoundingClientRect reports but layout does not.
  const SETTLED_PX = 30;

  test('a nav item scrolls its section clear of the sticky header', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Services' })
      .click();

    // The fixed bar must not be left covering the section it scrolled to.
    await expect.poll(() => clearance(page), { timeout: 15000 }).toBeLessThanOrEqual(SETTLED_PX);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});

test.describe('mobile drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('traps focus while open and restores it to the toggle on close', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open menu' });
    await toggle.click();

    const drawer = page.getByRole('dialog', { name: 'Site menu' });
    await expect(drawer).toBeVisible();

    // Focus lands inside the drawer rather than staying on the covered toggle.
    const close = page.getByRole('button', { name: 'Close menu' });
    await expect(close).toBeFocused();

    // Tabbing through every drawer stop and once more wraps back to the start,
    // so focus never escapes to the page behind the overlay.
    const stops = await drawer.locator('a[href], button:not([disabled])').count();
    for (let i = 0; i < stops; i++) {
      await page.keyboard.press('Tab');
    }
    await expect(close).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(toggle).toBeFocused();
  });

  test('a drawer link scrolls to its section and closes the drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'FAQ' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /right community fit/i })).toBeVisible();
  });

  test('rotating past the md breakpoint does not strand the page unscrollable', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Landscape on an iPhone 13 is 844px wide, past Tailwind's md (768px),
    // where the drawer and both close affordances become display:none.
    await page.setViewportSize({ width: 844, height: 390 });

    // md:hidden hides the drawer by CSS straight away, so poll for the state
    // update that actually releases the lock rather than racing React.
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 800));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('rotation is stopped but every bot feature is still reachable', async ({ page }) => {
    await page.goto('/');

    const counter = page.getByText(/^Feature \d+ of 10$/);
    await expect(counter).toHaveText('Feature 1 of 10');

    // Nothing advances on its own.
    await page.waitForTimeout(9000);
    await expect(counter).toHaveText('Feature 1 of 10');
    await expect(page.getByRole('button', { name: /feature rotation/ })).toHaveCount(0);

    // The stepper reaches the other nine, and only the active slide is exposed.
    for (let i = 2; i <= 10; i++) {
      await page.getByRole('button', { name: 'Next feature' }).click();
      await expect(counter).toHaveText(`Feature ${i} of 10`);
    }
    await expect(page.locator('[aria-roledescription="slide"][aria-hidden="false"]')).toHaveCount(1);
  });
});
