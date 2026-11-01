import { test, expect } from '@playwright/test';

import {
  LIVE_DECORATION_COUNT,
  SECTION_STYLES,
  liveDecorations,
  openStablePage,
} from './stabilize';

/**
 * The homepage, section by section rather than as one `fullPage` image.
 *
 * The page is around ten viewports tall at 1280 and nearer twenty at 360, so a
 * single baseline per width would be a multi-megabyte PNG in which any change
 * anywhere reports one failure covering everything. Per-section baselines name
 * the section that moved, and a change to the services copy leaves the other
 * six untouched.
 */

test.beforeEach(async ({ page }) => {
  await openStablePage(page, '/');
});

// The header is fixed, so it is in this shot at every width: the full bar above
// md, and the floating menu toggle below it. A viewport shot, not an element
// one, which is also what makes it the honest picture of the fixed chrome:
// see screenshot-section.css.
test('above the fold', async ({ page }) => {
  await expect(page).toHaveScreenshot('home-above-fold.png');
});

const sections = ['about', 'services', 'contact', 'faq'];

for (const id of sections) {
  test(`#${id} section`, async ({ page }) => {
    await expect(page.locator(`#${id}`)).toHaveScreenshot(`home-${id}.png`, {
      stylePath: SECTION_STYLES,
    });
  });
}

test('#modulix-bot section', async ({ page }) => {
  const decorations = liveDecorations(page);

  // The glow pulses forever and has to be masked. If the selector stops
  // matching, this says so once instead of the screenshot below failing on
  // one run in three.
  await expect(decorations[0]).toHaveCount(LIVE_DECORATION_COUNT);

  await expect(page.locator('#modulix-bot')).toHaveScreenshot('home-modulix-bot.png', {
    stylePath: SECTION_STYLES,
    mask: decorations,
  });
});

// `hidden md:block`: below the md breakpoint the marquee is not laid out at
// all, so there is nothing to photograph. Asserting that rather than skipping
// keeps the narrow widths from quietly covering one section fewer than the
// wide ones.
test('#testimonials section', async ({ page }) => {
  const companies = page.locator('#testimonials');

  if (page.viewportSize()!.width < 768) {
    await expect(companies).toBeHidden();
    return;
  }

  await expect(companies).toHaveScreenshot('home-testimonials.png', {
    stylePath: SECTION_STYLES,
  });
});

test('footer', async ({ page }) => {
  await expect(page.locator('footer')).toHaveScreenshot('home-footer.png', {
    stylePath: SECTION_STYLES,
  });
});

/**
 * The drawer is the one piece of UI that only exists at one end of the range,
 * and it is a plain conditional render with no framer-motion, so it needs no
 * settling beyond what the page has already had.
 */
test('mobile navigation drawer', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Open menu' });

  if (page.viewportSize()!.width >= 768) {
    // md:hidden on the toggle, so above the breakpoint the drawer is
    // unreachable and the primary nav in the bar above the fold is the nav.
    await expect(toggle).toBeHidden();
    return;
  }

  await toggle.click();
  // Covers the viewport, so the overlay and the drawer are both in frame.
  await expect(page).toHaveScreenshot('home-nav-drawer.png');
});
