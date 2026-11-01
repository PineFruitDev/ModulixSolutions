# Visual regression tests

Screenshot baselines for the pages at 360, 768 and 1280 CSS pixels wide, run by
Playwright against the static export. `npm run test:visual` builds the export
and compares; the `visual` job in `.github/workflows/test.yml` is what runs it
on every pull request.

These live in their own `playwright.visual.config.ts` rather than as two more
projects in `playwright.config.ts`. They want settings the smoke suite should
not have (a reduced-motion preference, no retries, their own port) and they are
slower, so they get their own command and their own CI job. `npm run test:smoke`
is unchanged.

## What is covered

The homepage is photographed section by section: above the fold, then `#about`,
`#modulix-bot`, `#services`, `#testimonials`, `#contact`, `#faq` and the footer.
It is around ten viewports tall at 1280 and nearer twenty at 360, so one
`fullPage` baseline per width would be a multi-megabyte image in which a change
anywhere reports one failure covering everything. Per-section baselines name the
section that moved, and a change to the services copy leaves the other six
untouched.

The three utility pages (`/contact-confirmed/`, `/404.html`, `/500/`) are short
enough to photograph whole, so they are `fullPage`. 404 is requested at the flat
path, the same as in the smoke suite: the local static server does not emulate
the hosting fallback, and `/404.html` is the only 404 GitHub Pages serves.

Two tests assert rather than photograph, at the width where the thing under test
does not exist. `#testimonials` is `hidden md:block`, so at 360 it is asserted
hidden; the navigation drawer is `md:hidden`, so at 768 and 1280 its toggle is
asserted hidden. Asserting beats skipping, which would let a narrow width
quietly cover one case fewer than a wide one.

360 and 1280 are the narrowest and the most common desktop width in the wild.
768 is exactly where Tailwind's `md:` rules take over, which is the width where
a responsive regression is most likely and least likely to be caught by eye.
`isMobile` is off at every width including 360: these tests check what the
layout does at a width, and `isMobile` additionally changes the visual viewport,
touch handling and scrollbars, which would make the narrow baselines differ from
the wide ones for reasons unrelated to the CSS under test.

## Why the baselines are Linux-only

`tests/visual/__screenshots__/linux` is committed. Everything else under
`__screenshots__` is gitignored.

Chromium rasterises text, gradients and blur through the host's graphics and
font stack, and the difference between macOS and Linux is far wider than any
per-pixel tolerance worth keeping. A baseline taken on a developer's machine is
one CI can never match. The platform is in `snapshotPathTemplate` so a local run
writes its own directory beside the committed set instead of silently comparing
against the wrong one, which also means **`npm run test:visual` on macOS or
Windows writes new baselines and passes**. It is not a check on those platforms.
Use it to look at what the suite captures; use CI, or the command below, to
decide whether something regressed.

## Regenerating the baselines

When a visual change is intentional, regenerate and commit the new PNGs in the
same pull request as the change, so the diff shows both.

```sh
npm run test:visual:baselines                 # all of them
npm run test:visual:baselines -- --project=w360 -g "#faq section"
```

This runs the suite inside `mcr.microsoft.com/playwright`, pinned to the version
resolved in `package-lock.json`, so the browser build matches what
`npx playwright install` puts on the runner. It needs a running Docker daemon
and an x86-64 host: Chromium does not survive QEMU's amd64 emulation, so on
Apple Silicon this crashes rather than producing arm64 images that would not
match CI anyway.

Without an x86-64 machine, take them from CI: let the `visual` job fail, then
download its `visual-diff` artifact, which holds the expected, actual and diff
image for every failure. The actual images are the new baselines.

## How the page is made deterministic

Almost everything that moves on this site is already keyed off
`prefers-reduced-motion`, which the config sets for every test, and
`tests/visual/stabilize.ts` handles the rest. In short:

- The particle canvas is seeded from `Math.random()`. `ParticleBackground`
  returns before drawing under the preference, and `screenshot.css` hides the
  element as well, so a change to that guard fails the reduced-motion unit test
  rather than every screenshot here at once.
- The taglines and the bot-feature carousel rotate on `setInterval`. Both stop
  under the preference and sit on their first entry.
- The reveals and the logo marquee are transforms, which framer-motion drops
  under `MotionConfig reducedMotion="user"`, and CSS animations, which the
  reduced-motion block in `globals.css` collapses to 0.01ms.
- What is left is opacity. `stabilize.ts` scrolls the whole page to trigger
  every `whileInView` reveal, forces every `loading="lazy"` image to load, and
  then waits for `document.getAnimations()` to go quiet rather than sleeping for
  the longest delay in the page.
- One thing survives all of that: the bot teaser pulses a `box-shadow` and the
  opacity of two rings on `repeat: Infinity`. Neither is a transform, so the
  preference leaves them running, and framer-motion writes `box-shadow` frame by
  frame rather than through the Web Animations API, so Playwright's
  `animations: 'disabled'` does not reach it either. All three are one centred
  128px square of decoration, which is masked. The bot-teaser test asserts the
  mask still matches three elements, so a redesign that renames those utility
  classes fails with that message instead of becoming an intermittent diff.

The tolerance is `threshold: 0.2` with `maxDiffPixelRatio: 0.01`. Antialiasing
on this page is doing real work (gradient text, gradient borders, backdrop blur,
a dozen glows) and rasterises a shade differently between Chromium builds, so a
byte-exact comparison would fail on a browser bump with nothing regressed. One
percent of a section is far below any layout change: a reflowed card, a wrapped
heading or a lost breakpoint moves whole bands of the image.

Element screenshots get `screenshot-section.css` on top, which hides the skip
link, the sticky bar and the menu toggle. A section taller than the viewport is
captured through Chromium's capture-beyond-viewport path, which paints
`position: fixed` elements into the top of the captured region rather than where
the page puts them, so the skip link that the page keeps off screen with a
`translateY(-120%)` lands inside the frame. All three are covered properly by
the above-the-fold and drawer screenshots, which are viewport shots.
