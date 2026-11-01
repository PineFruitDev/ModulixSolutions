import { test, expect } from '@playwright/test';

/**
 * The homepage animates with framer-motion's `m` component, which carries no
 * features of its own: `LazyMotion` in `pages/_app.tsx` registers them, and
 * registering `domAnimation` instead of importing `motion` is what keeps the
 * layout projection engine out of the shared bundle.
 *
 * The trade is that the feature set is now something that can be got wrong,
 * and getting it wrong does not throw. Nearly every section opens at
 * `opacity: 0` and reveals on `whileInView`, so a missing provider leaves the
 * page blank below the hero while every unit test still passes, because jsdom
 * has no layout and the IntersectionObserver in tests/setup.ts is a stub.
 * This is the only place that can tell the difference; removing the
 * `LazyMotion` wrapper was checked to fail this spec and nothing else.
 *
 * One assertion covers the whole of `domAnimation` on purpose. `inView` sits
 * in framer-motion's `gestureAnimations` group alongside `hover`, `focus` and
 * `tap`, so a reveal that runs proves the gesture half is registered and not
 * only the `animations` half. A hover assertion would not add to that: the
 * buttons also carry Tailwind's `hover:scale-105`, so their transform changes
 * on hover whether or not framer-motion is doing anything at all.
 */

/**
 * The selector is passed as an argument rather than closed over: the callback
 * is serialised and run in the page, where nothing from this module's scope
 * exists. Returns -1 for a missing node so a typo'd selector fails the
 * threshold instead of quietly reporting the default opacity of 1.
 */
const opacityOf = (page: import('@playwright/test').Page, selector: string) =>
  page.evaluate(sel => {
    const element = document.querySelector(sel);
    return element ? parseFloat(getComputedStyle(element).opacity) : -1;
  }, selector);

test('sections that open hidden are revealed once scrolled to', async ({ page }) => {
  await page.goto('/');

  // #hero renders with reveal={false} and is visible immediately, so it is the
  // control: if this were 0 the failure would be CSS, not the feature set.
  expect(await opacityOf(page, '#hero')).toBeGreaterThan(0.95);

  for (const section of ['#about', '#modulix-bot', '#services', '#contact']) {
    await page.locator(section).scrollIntoViewIfNeeded();
    await expect.poll(() => opacityOf(page, section), { timeout: 5000 }).toBeGreaterThan(0.95);
  }
});
