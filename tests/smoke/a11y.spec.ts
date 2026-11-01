import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

import { SITE_ROUTES } from '../../lib/seo/routes';

/**
 * The browser half of the accessibility gate.
 *
 * `tests/unit/axe.test.tsx` runs axe under jsdom, which has no layout engine
 * and no canvas. That silently removes every rule needing a rendered pixel or
 * a computed box, and `color-contrast` is the important casualty: under jsdom
 * it is not reported as a pass or a failure, it is simply never run.
 *
 * This file is the only place the real rule executes against the real
 * stylesheet, so it is what actually proves the palette survives Tailwind
 * compiling it, gradients included. It also picks up the document-scoped rules
 * a detached jsdom container cannot satisfy: `html-has-lang`, `document-title`,
 * `region`, `landmark-one-main`, `page-has-heading-one` and `skip-link`.
 */

test.beforeEach(async ({ page }) => {
  // Fail closed: no external traffic, matching the other smoke specs.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const scan = (page: Page) => new AxeBuilder({ page }).withTags(WCAG_22_AA);

/** Readable failure output: axe's own object dump is unusable in a CI log. */
const describeViolations = (violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) =>
  violations
    .map(
      v =>
        `${v.id} (${v.impact}, ${v.tags.filter(t => t.startsWith('wcag')).join('/')}): ${v.help}\n` +
        v.nodes.map(n => `    ${n.target.join(' ')}\n      ${n.failureSummary}`).join('\n')
    )
    .join('\n\n');

for (const route of SITE_ROUTES) {
  test(`${route.path} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(route.path);
    // The hero and section reveals animate in; scanning mid-transition can
    // sample a half-faded colour and report contrast that no one ever sees.
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const { violations } = await scan(page).analyze();
    expect(describeViolations(violations)).toBe('');
  });
}

test('the homepage still passes with every FAQ answer expanded', async ({ page }) => {
  await page.goto('/');
  // Collapsed answers are height:0 and aria-hidden, so their text is excluded
  // from the contrast scan until they are opened. Scoped to the FAQ section on
  // purpose: the menu toggle is also an aria-expanded button, and opening the
  // drawer would cover the very questions this is trying to click.
  //
  // Selected on aria-controls rather than aria-expanded="false": clicking
  // rewrites the attribute the locator matched on, which renumbers the list
  // mid-loop and strands the later indexes.
  const questions = page.locator('#faq button[aria-controls^="faq-answer"]');
  for (let i = 0; i < (await questions.count()); i++) {
    await questions.nth(i).click();
  }
  await expect(page.locator('#faq button[aria-expanded="false"]')).toHaveCount(0);

  const { violations } = await scan(page).analyze();
  expect(describeViolations(violations)).toBe('');
});

test('the mobile drawer passes while it is open and modal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeVisible();

  const { violations } = await scan(page).analyze();
  expect(describeViolations(violations)).toBe('');
});

test('the inquiry form passes while showing its validation error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Discord Username (optional)').fill('x');
  await page.getByLabel('Name *', { exact: true }).fill('Smoke Tester');
  await page.getByLabel('Email *', { exact: true }).fill('smoke@example.com');
  await page.getByLabel('Message *', { exact: true }).fill('Synthetic test inquiry only.');
  await page.getByRole('button', { name: 'Send Message' }).click();

  // The error surface is a different colour pairing (red-300 on red-950/50)
  // from anything on the page at rest, so it needs its own contrast scan.
  // Scoped to the form because Next ships its own empty role="alert" route
  // announcer, which makes an unscoped alert lookup ambiguous.
  await expect(page.locator('form [role="alert"]')).toBeVisible();
  const { violations } = await scan(page).analyze();
  expect(describeViolations(violations)).toBe('');
});

test('the homepage passes under a reduced-motion preference', async ({ page }) => {
  // Reduced motion swaps which controls exist (the pause buttons drop out) and
  // leaves the reveal transforms unapplied, so it is a genuinely different
  // tree to scan, not the same one slowed down.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /rotating taglines/ })).toHaveCount(0);

  const { violations } = await scan(page).analyze();
  expect(describeViolations(violations)).toBe('');
});

/**
 * WCAG 2.2.2 Pause, Stop, Hide (Level A). The taglines rotate on a 3.5s timer,
 * so the pause control is required, and "present in the DOM" is not the same
 * as operable.
 *
 * The hero's decorative tint is absolutely positioned while the hero content
 * is in normal flow, and a positioned element paints above a static sibling
 * regardless of z-index. That overlay therefore covered the whole hero and ate
 * every pointer event aimed at this button: it was keyboard-operable but
 * completely unclickable. The unit suite could not see it because jsdom does
 * no hit testing, which is the whole reason this assertion lives in a browser.
 */
test('the tagline pause control is operable by pointer, not just by keyboard', async ({ page }) => {
  await page.goto('/');

  const pause = page.getByRole('button', { name: 'Pause rotating taglines' });
  await expect(pause).toBeVisible();

  // Nothing decorative may sit between the user and this control.
  const topmost = await pause.evaluate(el => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit === el || el.contains(hit) ? 'the control' : `${hit?.className}`;
  });
  expect(topmost).toBe('the control');

  // And a real click, with no force, has to land and change the state.
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume rotating taglines' })).toBeVisible();
});

test('the focus ring survives a forced-colors mode', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();

  // Focus everywhere else is drawn with Tailwind ring utilities, which compile
  // to box-shadow, and forced-colors drops box-shadow entirely. globals.css
  // adds an outline for exactly this case; without it there is no visible
  // focus at all in Windows High Contrast (WCAG 2.4.7).
  const outlineWidth = await skip.evaluate(el => getComputedStyle(el).outlineWidth);
  expect(parseFloat(outlineWidth)).toBeGreaterThanOrEqual(2);
});

/**
 * WCAG 2.2 2.4.11 Focus Not Obscured (Minimum), AA. There is no axe rule for
 * this; it needs real geometry. The site has a fixed desktop header, which is
 * the exact condition the criterion was written for: tab to something near the
 * top of a scrolled page and the bar can cover it.
 */
test.describe('focus is never hidden behind the fixed header', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('every keyboard stop stays clear of the header', async ({ page }) => {
    await page.goto('/');

    const headerBottom = await page.evaluate(() => {
      const bar = document.querySelector('.site-header');
      return bar ? bar.getBoundingClientRect().bottom : 0;
    });
    expect(headerBottom).toBeGreaterThan(0);

    // Walk a generous slice of the tab order rather than the whole page: this
    // is about the scroll position focus lands at, and it stabilises within
    // the first couple of sections.
    const obscured: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');

      const stop = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;

        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return null;

        // Sample just inside the top edge, which is the part a bar pinned to
        // the top of the viewport would eat first.
        const x = box.left + Math.min(box.width / 2, 24);
        const y = box.top + 2;
        if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) return null;

        // Comparing rectangles cannot answer this: the skip link overlaps the
        // header's box but paints at z-index 10000 on top of it, so it is
        // perfectly visible. Only a hit test knows what the user can see.
        const hit = document.elementFromPoint(x, y);
        const covered = !!hit && hit !== el && !el.contains(hit) && !hit.contains(el);

        return {
          covered,
          label: (el.getAttribute('aria-label') || el.textContent || el.tagName)
            .trim()
            .slice(0, 40),
          by: covered
            ? `${hit!.tagName.toLowerCase()}.${(hit!.className || '').toString().split(' ')[0]}`
            : '',
        };
      });

      if (stop?.covered) obscured.push(`${stop.label} covered by ${stop.by}`);
    }

    expect(obscured.join('\n')).toBe('');
  });
});
