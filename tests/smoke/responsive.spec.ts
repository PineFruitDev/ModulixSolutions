import { test, expect, type Page } from '@playwright/test';

/**
 * Viewport regressions, asserted against the real export in a real engine.
 *
 * These run as their own file rather than inside `pages.spec.ts` because they
 * drive the viewport themselves: the config's desktop/mobile projects would
 * otherwise run each case at a size it was not written for, and every
 * assertion here is about a specific width.
 *
 * 360 is the narrowest phone worth supporting, 768 is the breakpoint where the
 * sticky bar and the testimonials strip appear, and 1280 is a laptop. They are
 * the three widths the layout actually changes at.
 */
const WIDTHS = [360, 768, 1280] as const;

const PAGES = ['/', '/404.html', '/500/', '/contact-confirmed/'] as const;

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page }) => {
  // Fail closed, the same as the rest of the browser suite.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

/**
 * `html` carries `scroll-behavior: smooth`, so every scroll here animates and
 * a measurement taken too early reads a position the page is still moving
 * through. Waits for the offset to stop changing rather than guessing a delay.
 */
async function scrollIdle(page: Page) {
  await page.waitForFunction(
    () =>
      new Promise<boolean>(resolve => {
        const start = window.scrollY;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(window.scrollY === start))
        );
      }),
    undefined,
    { timeout: 10_000 }
  );
}

/**
 * Walks the page so every `whileInView` reveal fires and settles, then returns
 * to the top. Measuring before this runs reports the pre-reveal geometry,
 * where half the page is still at `opacity: 0` and its own offset transform.
 */
async function settle(page: Page) {
  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 600) {
    await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
}

/** Brings a section into view and waits for the smooth scroll to finish. */
async function showSection(page: Page, id: string) {
  await page.evaluate(
    sectionId => document.getElementById(sectionId)!.scrollIntoView({ behavior: 'instant' }),
    id
  );
  await scrollIdle(page);
  await page.waitForTimeout(300);
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of PAGES) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(path);
        await settle(page);
        // The viewport's own width, not an assumed one: a scrollbar on the
        // desktop project makes the layout viewport narrower than the window.
        const { doc, viewport } = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
        }));
        expect(doc, `${path} at ${width}px overflows horizontally`).toBeLessThanOrEqual(viewport);
      });

      test(`${path} has no control under 44px`, async ({ page }) => {
        await page.goto(path);
        await settle(page);

        const small = await page.evaluate(() => {
          const offenders: { label: string; w: number; h: number }[] = [];
          for (const el of Array.from(document.querySelectorAll<HTMLElement>(
            'a[href], button, input, textarea, select, [role="button"]'
          ))) {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            // Wrappers around other controls are measured through their own
            // children, not as one big target.
            if (el.querySelector('a[href], button')) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;

            // The painted box is not the whole target. A `.tap-target` control
            // keeps its small visual size and carries the rest of its reach in
            // a centred ::after overlay, which real clicks land on (the test
            // below proves that) but which getBoundingClientRect never reports
            // and elementFromPoint does not attribute back to the element. So
            // ask the engine for the overlay's resolved size and take the
            // larger of the two.
            //
            // An overlay only counts if it is absolutely positioned *and* the
            // control establishes the containing block it resolves against.
            // Without that pairing the box is still 44px wide but it is
            // centred on some ancestor instead, covering anything but the
            // control it belongs to.
            const after = getComputedStyle(el, '::after');
            const anchored =
              after.content !== 'none' &&
              after.content !== '' &&
              after.position === 'absolute' &&
              style.position !== 'static';
            const w = Math.max(rect.width, anchored ? parseFloat(after.width) || 0 : 0);
            const h = Math.max(rect.height, anchored ? parseFloat(after.height) || 0 : 0);

            if (w < 44 || h < 44) {
              offenders.push({
                label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 50),
                w: Math.round(w),
                h: Math.round(h),
              });
            }
          }
          return offenders;
        });

        expect(small, `${path} at ${width}px`).toEqual([]);
      });
    }

    test('body text stays at 12px or above', async ({ page }) => {
      await page.goto('/');
      await settle(page);
      const tiny = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .filter(el => {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            // Only elements holding text of their own; a wrapper inherits a
            // size it never renders at.
            const ownText = Array.from(el.childNodes).some(
              n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()
            );
            return ownText && parseFloat(style.fontSize) < 12;
          })
          .map(el => `${parseFloat(getComputedStyle(el).fontSize)}px: ${el.textContent!.trim().slice(0, 40)}`)
      );
      expect(tiny).toEqual([]);
    });
  });
}

test.describe('hero', () => {
  // 640 is the short end of the phone range, and the height the old layout
  // failed at: three nested `min-h-screen` plus the container's padding made
  // the section 704px tall inside it and pushed the call to action out of
  // sight. The section must not exceed the viewport it is sized against.
  test.use({ viewport: { width: 360, height: 640 } });

  test('fits a small phone, call to action included', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(600);

    const { heroHeight, viewportHeight, ctaBottom } = await page.evaluate(() => {
      const cta = Array.from(document.querySelectorAll('#hero button')).find(b =>
        /Launch Your Campaign/.test(b.textContent || '')
      )!;
      return {
        heroHeight: document.querySelector('#hero')!.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
        ctaBottom: cta.getBoundingClientRect().bottom,
      };
    });

    expect(Math.round(heroHeight)).toBeLessThanOrEqual(viewportHeight);
    expect(ctaBottom, 'Launch Your Campaign is below the fold').toBeLessThanOrEqual(viewportHeight);
  });
});

test.describe('feature carousel', () => {
  for (const width of WIDTHS) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 900 } });

      // The slides sit in a single grid cell rather than being absolutely
      // positioned, so the track sizes to the tallest of them. Under the old
      // fixed 380px track the tallest card rendered 486px at 360px and
      // overlapped the stepper row by 36px, putting its controls under a card.
      test('no slide outgrows its track or reaches the controls', async ({ page }) => {
        await page.goto('/');
        await settle(page);
        await showSection(page, 'modulix-bot');
        await page.getByRole('button', { name: 'Pause feature rotation' }).click();
        await page.waitForTimeout(300);

        // One measurement covers all ten slides: they share a grid cell, so
        // every one of them is laid out and measurable whichever is on top.
        // That is the property under test, and it is also why stepping through
        // them is unnecessary.
        const measure = () =>
          page.evaluate(() => {
            const track = document.querySelector('[aria-roledescription="carousel"]')!;
            const controls = track.nextElementSibling!;
            const trackBox = track.getBoundingClientRect();
            const slides = Array.from(track.querySelectorAll('[aria-roledescription="slide"]'));
            const heights = slides.map(s => s.getBoundingClientRect().height);
            return {
              slideCount: slides.length,
              tallest: Math.max(...heights),
              trackHeight: trackBox.height,
              gapToControls: controls.getBoundingClientRect().top - trackBox.bottom,
            };
          });

        const before = await measure();
        expect(before.slideCount).toBe(10);
        expect(
          Math.round(before.tallest),
          `the tallest slide outgrows its track at ${width}px`
        ).toBeLessThanOrEqual(Math.round(before.trackHeight));
        expect(
          before.gapToControls,
          `the track overlaps its own controls at ${width}px`
        ).toBeGreaterThanOrEqual(0);

        // Stepping must not resize the track. A height driven by the active
        // slide rather than the tallest one would shunt everything below it on
        // every rotation.
        await page.getByRole('button', { name: 'Next feature' }).click();
        await page.waitForTimeout(1200);
        const after = await measure();
        expect(
          Math.round(after.trackHeight),
          `the track resized when the slide changed at ${width}px`
        ).toBe(Math.round(before.trackHeight));
      });
    });
  }
});

test.describe('tap target overlays', () => {
  test.use({ viewport: { width: 360, height: 900 } });

  // The geometry assertions above trust `::after` to be part of its control's
  // hit area. This is the case that proves it, so the technique cannot quietly
  // stop working and leave those assertions passing against nothing.
  test('a click outside the painted box still operates the control', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await showSection(page, 'modulix-bot');
    await page.getByRole('button', { name: 'Pause feature rotation' }).click();
    await page.waitForTimeout(600);

    const readout = () =>
      page.locator('[aria-roledescription="carousel"] + div p').textContent();

    const next = page.getByRole('button', { name: 'Next feature' });
    const box = (await next.boundingBox())!;
    // The button paints at 36px, so its own edge is 18px from centre. 21px up
    // is outside that and inside the 44px overlay.
    expect(box.height).toBeLessThan(44);

    const before = await readout();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 21);
    await page.waitForTimeout(600);

    expect(
      await readout(),
      'a tap 21px above centre missed a control that claims a 44px target'
    ).not.toBe(before);
  });
});

test.describe('line length', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // The hero paragraph ran the full 1248px container at 24px, setting 103
  // characters to the line. Past roughly 90 the eye loses the line it is on.
  test('no paragraph runs past 90 characters a line', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    const longest = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('p'))
        .map(el => {
          const text = (el.textContent || '').trim();
          const style = getComputedStyle(el);
          if (text.length < 60 || style.display === 'none') return null;
          const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
          const lines = Math.max(1, Math.round(el.getBoundingClientRect().height / lineHeight));
          return { charsPerLine: Math.round(text.length / lines), text: text.slice(0, 50) };
        })
        .filter((x): x is { charsPerLine: number; text: string } => x !== null)
        .filter(x => x.charsPerLine > 90)
    );

    expect(longest).toEqual([]);
  });
});
