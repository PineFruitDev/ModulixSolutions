import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The ways a visitor actually arrives at a section: every primary nav item, a
 * shared link that already carries the fragment, and the links off a dead end.
 *
 * These are browser-only on purpose. jsdom performs no layout, so the unit
 * suite stubs the section boxes and the bar's height and asserts the eased
 * positions the handler computes. What it cannot do is prove that a real
 * document, with real section heights and the reveal transforms applied, ends
 * up with the section the visitor asked for actually on screen. That is the
 * part that breaks when a section is reordered, renamed, or given a different
 * amount of padding, and it is what these cases check.
 */

test.beforeEach(async ({ page }) => {
  // Fail closed, as the rest of the smoke suite does: no external traffic.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

/**
 * Where a section has come to rest, and whether the page could have scrolled
 * any further. The fixed bar is `hidden md:block`, so below md there is no bar
 * to clear and its bottom is taken as the top of the viewport.
 */
const resting = (page: Page, id: string) =>
  page.evaluate(sectionId => {
    const section = document.getElementById(sectionId) as HTMLElement;
    const bar = document.querySelector('.site-header');
    const barBottom =
      bar instanceof HTMLElement && getComputedStyle(bar).display !== 'none'
        ? bar.getBoundingClientRect().bottom
        : 0;
    const box = section.getBoundingClientRect();
    return {
      // Negative means the bar is covering the top of the section.
      clearance: Math.round(box.top - barBottom),
      scrollY: Math.round(window.scrollY),
      maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      onScreen: box.top < window.innerHeight && box.bottom > barBottom,
    };
  }, id);

/**
 * The hand-written animation advances on requestAnimationFrame, which a
 * headless browser throttles hard, so callers poll this rather than guess a
 * duration. It settles at up to 24px rather than 0 because a revealed section
 * keeps a 24px vertical transform that getBoundingClientRect reports and
 * layout does not, which is the same allowance keyboard.spec.ts makes.
 */
const SETTLED_PX = 30;

/**
 * Returns the literal 'landed' once the section is where the visitor asked for
 * it, and otherwise a description of where it actually is, so a failure names
 * the geometry instead of just reporting `false`.
 */
const landing = async (page: Page, id: string) => {
  const { clearance, scrollY, maxScroll, onScreen } = await resting(page, id);
  if (Math.abs(clearance) <= SETTLED_PX) return 'landed';
  // The last section on the page cannot be pulled up to the bar: the document
  // runs out of scroll first. Being at the bottom with the section on screen is
  // as far as the page can honour the request.
  if (scrollY >= maxScroll - 2 && onScreen) return 'landed';
  return `#${id}: clearance ${clearance}px at scrollY ${scrollY} of ${maxScroll}`;
};

const expectLanded = (page: Page, id: string) =>
  expect.poll(() => landing(page, id), { timeout: 15000 }).toBe('landed');

// The bar, and so the primary nav, only exists above md. Both projects run
// every file, so the viewport is pinned rather than left to whichever one the
// project happens to use.
test.describe('primary nav', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // Every in-page nav target, not just one of them. #modulix-bot is the reason
  // this is a loop: its id is the only one that does not match its label.
  const targets = [
    ['About', 'about'],
    ['Bot', 'modulix-bot'],
    ['Services', 'services'],
    ['Contact', 'contact'],
    ['FAQ', 'faq'],
  ] as const;

  for (const [label, id] of targets) {
    test(`${label} lands on #${id}, clear of the sticky bar`, async ({ page }) => {
      await page.goto('/');
      await page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: label, exact: true })
        .click();
      await expectLanded(page, id);
    });
  }

  test('Home returns a scrolled reader to the top', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });

    await nav.getByRole('link', { name: 'FAQ', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 15000 }).toBeGreaterThan(0);

    // #hero is full-bleed under the translucent bar, so "clear of the bar" is
    // not the invariant here; being back at the top of the document is.
    await nav.getByRole('link', { name: 'Home', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 15000 })
      .toBeLessThanOrEqual(SETTLED_PX);
  });
});

test.describe('arriving on a fragment', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // A link shared from the 404 page, a search result or a chat window loads the
  // document already pointed at a section, which goes through the browser's own
  // fragment handling and not through the click handler the nav uses.
  for (const id of ['services', 'contact', 'faq']) {
    test(`a shared /#${id} link opens on that section`, async ({ page }) => {
      await page.goto(`/#${id}`);

      // The native fragment jump aligns the section with the top of the
      // viewport, which leaves the fixed bar overlapping its heading. That is
      // the current behaviour and is not asserted as clearance here; what
      // matters for the flow is that the visitor arrives at the right section
      // instead of at the top of a long homepage.
      await expect(page.locator(`#${id}`)).toBeInViewport();
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
  }
});

test.describe('out of a dead end', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  // pages.spec.ts pins the hrefs these buttons carry. This pins that following
  // one puts the visitor in front of the section it names, across the page
  // load that sits in between.
  test('Browse services from the 404 arrives at the services section', async ({ page }) => {
    await page.goto('/404.html');
    await page.getByRole('link', { name: /Browse services/ }).click();
    await expect(page).toHaveURL(/\/#services$/);
    await expect(page.locator('#services')).toBeInViewport();
  });

  test('Get in touch from the 404 arrives at the form, ready to type', async ({ page }) => {
    await page.goto('/404.html');
    await page.getByRole('link', { name: /Get in touch/ }).click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator('#contact')).toBeInViewport();
    await expect(page.getByLabel('Name *', { exact: true })).toBeVisible();
  });
});

// Left unpinned so it runs on both viewports: the footer is a three-column grid
// above lg and a reordered stack below it.
test('the footer logo returns home from a status page', async ({ page }) => {
  await page.goto('/500/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'MODULIX' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#hero')).toBeInViewport();
});
