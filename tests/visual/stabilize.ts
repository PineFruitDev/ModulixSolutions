import type { Locator, Page } from '@playwright/test';

/**
 * How long to keep waiting after the page has gone quiet.
 *
 * `waitForAnimationsToFinish` below returns as soon as no finite animation is
 * running, which is one frame before the final value has necessarily been
 * painted. This buffer covers that frame. It is deliberately small: it is not
 * standing in for the wait, it is standing behind it.
 */
const PAINT_BUFFER_MS = 250;

/**
 * Loads `path` from the local export and waits until nothing on it is still
 * moving, so that the screenshot taken next is the same one every run.
 *
 * Three things make this page non-deterministic and each is handled in a
 * different place:
 *
 *  - The particle canvas is seeded from `Math.random()`. The reduced-motion
 *    preference these tests run under makes `ParticleBackground` bail out
 *    before it draws, and `screenshot.css` hides the element as well.
 *  - The taglines and the bot-feature carousel rotate on `setInterval`. Both
 *    stop under the same preference, so they sit on their first entry.
 *  - The reveal and marquee animations are transforms, which framer-motion
 *    drops under `MotionConfig reducedMotion="user"`, and CSS animations,
 *    which `globals.css` collapses to 0.01ms under the same preference. What
 *    is left is opacity, and that is what the wait below is for.
 *
 * The one thing none of that reaches is masked at the call site: see
 * `liveDecorations`.
 */
export async function openStablePage(page: Page, path: string): Promise<void> {
  // Fail closed on external traffic, the same way the smoke suite does: a
  // third-party font or logo that loaded on one run and not the next is a
  // diff with no cause.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });

  await page.goto(path);
  await loadEveryImageEagerly(page);
  await scrollTheWholePage(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForEverythingToSettle(page);
}

/**
 * Drops `loading="lazy"` from every image on the page.
 *
 * Which images a lazy load has got around to fetching depends on how the
 * scroll went, which is exactly the kind of thing a baseline must not depend
 * on. Flipping them all to eager up front removes the question: every image is
 * either loaded or broken by the time anything is photographed, and the walk
 * below no longer has to double as a loader.
 *
 * It also makes the wait terminable. Waiting on `complete` alone never
 * finishes while the marquee's clipped second copy of the logo strip sits
 * deferred, and `complete || !currentSrc` does not help: Chromium populates
 * `currentSrc` when it selects the URL, before it decides to defer, so a
 * deferred image is indistinguishable from one still in flight.
 *
 * This changes when images load, not how they render, and every one of them is
 * served from the local export.
 */
async function loadEveryImageEagerly(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const image of Array.from(document.images)) image.loading = 'eager';
  });
}

/**
 * Scrolls to the bottom and leaves the page there.
 *
 * Two reasons, both of which would otherwise show up as a blank band in a
 * section screenshot. The reveals use `whileInView` with `once: true`, so a
 * section that has never been scrolled past is still at `opacity: 0`; and the
 * footer logo and every carousel logo are `loading="lazy"`.
 *
 * Playwright scrolls an element into view before an element screenshot, which
 * would trigger that section's own reveal, but not the ones below it, and the
 * reveal would then be starting at the moment the screenshot is taken. Doing
 * the whole page up front means every reveal has already finished by the time
 * any screenshot is due.
 */
async function scrollTheWholePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Less than a full viewport per step, so a section shorter than the
    // viewport cannot be skipped over between two frames.
    const step = Math.round(window.innerHeight * 0.75);

    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(requestAnimationFrame);
    }

    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise(requestAnimationFrame);
  });
}

async function waitForEverythingToSettle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await waitForImagesToLoad(page);
  await waitForAnimationsToFinish(page);
  await page.waitForTimeout(PAINT_BUFFER_MS);
}

/**
 * Waits for every image to settle, which `loadEveryImageEagerly` has made a
 * question that gets an answer. `complete` is also true for an image that
 * failed, so a missing logo shows up as the fallback it renders rather than
 * as a timeout here.
 */
async function waitForImagesToLoad(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Array.from(document.images).every(image => image.complete),
    undefined,
    { timeout: 15_000 }
  );
}

/**
 * Waits until every animation that is going to end has ended.
 *
 * framer-motion runs opacity through the Web Animations API, so the reveals
 * and the staggered carousel cards (up to 2.1s of accumulated delay) are all
 * visible to `document.getAnimations()`. Waiting on the set being quiet beats
 * sleeping for the longest delay: it does not have to be re-tuned when a delay
 * changes, and it does not get shorter than the work when the machine is
 * loaded and running two workers.
 *
 * Two kinds of animation are never going to end and are excluded:
 *
 *  - Endless ones. The bot teaser's two decorative rings pulse their opacity
 *    on `repeat: Infinity`, which framer-motion accelerates into a Web
 *    Animation with `iterations: Infinity`. Playwright's
 *    `animations: 'disabled'`, set in the config, rewinds those to their first
 *    frame as it takes the shot.
 *  - Sub-frame ones. The same teaser pulses a `box-shadow`, which
 *    framer-motion cannot accelerate, so it writes a new inline value every
 *    frame instead. Each write starts a fresh CSS transition, and because the
 *    reduced-motion block in globals.css caps every transition at 0.01ms,
 *    there is permanently one 0.01ms transition in the `running` state and the
 *    set never goes quiet. 0.01ms is three orders of magnitude below a frame,
 *    so nothing that short is mid-way through being visible.
 *
 * All three live in one 128px square, which `liveDecorations` masks.
 */
async function waitForAnimationsToFinish(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter(animation => animation.playState === 'running')
        .every(animation => {
          const timing = animation.effect?.getComputedTiming();
          if (timing?.iterations === Infinity) return true;
          // `duration` is `'auto'` for an effect with no duration of its own,
          // and NaN fails this comparison, which is the safe way round.
          return Number(timing?.duration) <= 1;
        }),
    undefined,
    { timeout: 15_000 }
  );
}

/**
 * Stylesheets for an element screenshot, as `stylePath`.
 *
 * Passing `stylePath` per call replaces the config's value rather than adding
 * to it, so the base sheet has to be repeated here.
 */
export const SECTION_STYLES = [
  './tests/visual/screenshot.css',
  './tests/visual/screenshot-section.css',
];

/**
 * How many elements `liveDecorations` expects to find: the badge and its two
 * rings. Asserted by the bot-teaser test, because the selector is built out of
 * Tailwind utilities and a redesign that renamed them would otherwise silently
 * stop masking and leave the suite intermittently failing instead of saying
 * what changed.
 */
export const LIVE_DECORATION_COUNT = 3;

/**
 * The one region that keeps moving however the page is loaded, to be passed as
 * `mask` to the screenshot that contains it.
 *
 * The bot teaser pulses a `box-shadow` on the badge and the opacity of the two
 * rings around it, both on `repeat: Infinity`. Neither is a transform, so
 * `MotionConfig reducedMotion="user"` leaves them running; the rings are
 * endless Web Animations and the box-shadow is written frame by frame, so
 * `animations: 'disabled'` does not settle them either.
 *
 * All three are the same centred 128px square, so one mask covers them, and
 * they are decoration around a static logo. The rest of the section, which is
 * the part that can regress, stays under test.
 */
export function liveDecorations(page: Page): Locator[] {
  return [page.locator('#modulix-bot .w-32.h-32')];
}
