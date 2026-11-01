import { defineConfig, devices } from '@playwright/test';

/**
 * The three widths the layout is designed around: a small phone, the `md`
 * breakpoint, and a laptop. 360 and 1280 are the narrowest and the most common
 * desktop width in the wild; 768 is exactly where Tailwind's `md:` rules take
 * over, which is the width where a responsive regression is most likely and
 * least likely to be noticed by eye.
 *
 * The heights are the shortest plausible for each width, so a section that
 * overflows its viewport does so in the baseline rather than being hidden by a
 * generous one.
 */
const WIDTHS = [
  { name: 'w360', viewport: { width: 360, height: 800 } },
  { name: 'w768', viewport: { width: 768, height: 1024 } },
  { name: 'w1280', viewport: { width: 1280, height: 800 } },
];

/**
 * Visual regression suite, deliberately a second config rather than two more
 * projects in playwright.config.ts.
 *
 * These tests want settings the smoke suite should not have (a reduced-motion
 * preference, no retries, zero tolerance for an unmatched baseline) and they
 * are slower, so they get their own command and their own CI step. Keeping
 * them apart also means `npm run test:smoke` is unchanged.
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A visual diff is not a flake. Retrying re-takes the same screenshot of the
  // same static export and reports the same difference, having hidden the fact
  // that it failed twice.
  retries: 0,
  workers: 2,
  // The default 30s is not enough: every test scrolls the whole page to settle
  // the reveals and the lazy logos before it photographs anything, and at 360
  // that page is around twenty viewports tall.
  timeout: 90_000,

  // Platform is in the path on purpose. These baselines are Linux Chromium,
  // generated to match the CI runner, and a macOS or Windows run writes its own
  // set beside them rather than silently comparing against the wrong one. See
  // tests/visual/README.md for how to regenerate them.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',

  use: {
    baseURL: 'http://127.0.0.1:3200',
    // No trace: these tests fill in no forms, but a trace of a failing run
    // bundles every screenshot twice for no benefit.
    trace: 'off',
    // Everything that makes this page move is keyed off this preference, and
    // the repo already honours it in CSS, in MotionConfig, in the canvas and
    // in both rotators. See tests/visual/stabilize.ts.
    reducedMotion: 'reduce',
    // The site has no light theme, so this only pins what `prefers-color-scheme`
    // reports rather than selecting between two designs.
    colorScheme: 'dark',
    deviceScaleFactor: 1,
  },

  expect: {
    toHaveScreenshot: {
      // Antialiasing on this page is doing real work: gradient text, gradient
      // borders, backdrop blur and a dozen glows. Those rasterise a shade
      // differently between Chromium builds, so a byte-exact comparison would
      // fail on a browser bump without anything having regressed.
      //
      // `threshold` is the per-pixel YIQ tolerance, which absorbs that;
      // `maxDiffPixelRatio` is the budget for pixels that exceed it. 1% of a
      // section is far below any layout change: a reflowed card, a wrapped
      // heading or a lost breakpoint moves whole bands of the image.
      threshold: 0.2,
      maxDiffPixelRatio: 0.01,
      // Freezes CSS animations and Web Animations to their first frame.
      animations: 'disabled',
      caret: 'hide',
      // CSS pixels, not device pixels, so the baseline does not depend on the
      // scale factor of the machine that took it.
      scale: 'css',
      stylePath: './tests/visual/screenshot.css',
    },
  },

  projects: WIDTHS.map(({ name, viewport }) => ({
    name,
    use: {
      ...devices['Desktop Chrome'],
      viewport,
      // Left off at every width, 360 included. These tests check what the
      // layout does at a width; `isMobile` additionally changes the visual
      // viewport, touch handling and scrollbar behaviour, which would make the
      // narrow baselines differ from the wide ones for reasons that have
      // nothing to do with the CSS under test. Touch behaviour is the
      // responsive suite's job, not this one's.
      isMobile: false,
      hasTouch: false,
    },
  })),

  // Port 3200, not the smoke suite's 3100, so the two can run at once locally
  // without one killing the other's server.
  webServer: {
    command: 'python3 -m http.server 3200 --bind 127.0.0.1 --directory out',
    url: 'http://127.0.0.1:3200',
    reuseExistingServer: false,
  },
});
