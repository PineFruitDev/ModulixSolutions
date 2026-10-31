# Tests

Use Node 22 and `npm ci`.

- `npm test`: isolated Jest/Testing Library component tests.
- `npm run test:coverage`: the same suite, plus a coverage report and the
  thresholds in `jest.config.js`. This is what CI runs.
- `npm run type-check`: TypeScript validation.
- `npx playwright install chromium`: install the smoke-test browser.
- `npm run test:smoke`: build the static export and test it on localhost port 3100.

Coverage is collected per file across `components`, `hooks` and `pages`, so a
component nobody imports reports the 0% it is rather than disappearing into an
average. `pages/_document.tsx` is excluded because it renders no DOM outside a
Next build; `next build` in the smoke suite is what exercises it. The thresholds
are a ratchet set just below the current numbers, to catch a drop rather than to
be nudged up a point at a time.

Unit tests also cover landmarks, named controls, image dimensions, FAQ buttons,
and the absence of render-blocking font CSS. Smoke tests cover desktop and mobile Chromium viewports, homepage sections,
contact submission with a synthetic response, confirmation, and the exported
status pages (404, 500, confirmation): their headings, their `noindex` robots
tag, and the links back into the site. They block external requests by default
and never submit a real inquiry. Tracing is disabled to avoid retaining form
request data. The local static server does not emulate hosting-specific
missing-route fallback, so 404 is requested at `/404.html` directly; that is
also the only status page GitHub Pages serves for a missing route. These tests
do not establish delivery by the form provider or device acceptance.

`tests/unit/states.test.tsx` covers the shared state components: which tones
interrupt with `role="alert"` versus announce politely, the busy flag on the
loading tone, error-boundary containment and recovery, the company logo
fallback, and the contact form's status machine. The post-success redirect is
asserted in the browser suite instead, because jsdom neither implements that
navigation nor allows `window.location` to be replaced.

`tests/unit/navigation.test.tsx` covers the header's hand-written smooth scroll
and the drawer's keyboard handling. jsdom performs no layout, so the section
boxes, the sticky bar's height, the viewport width and the scroll offset are all
stubbed, and `requestAnimationFrame` is driven with explicit timestamps: the
eased positions are not assertable if a clock decides how far each frame moved.
It pins the zero-distance case, where clicking the section the page already
rests on used to divide by a zero duration and scroll to `NaN`, which browsers
normalise to the top of the page.

That case is covered in jsdom only, deliberately. A browser run cannot reach it
from a repeated nav click: the section's reveal leaves a 24px vertical
transform, which `getBoundingClientRect` reports and the handler therefore
measures, so the distance never comes out at exactly zero on the second click.
A smoke test written against that sequence passes with the bug still present and
would be a guard in name only. The browser suite checks the part it can check
honestly, that a nav click lands the section clear of the sticky bar, and the
unit test, whose stubbed geometry models a settled section, is what fails if the
zero-duration guard is removed.

`tests/unit/particles.test.tsx` drives the canvas field with a recording
2D-context stub (`tests/setup.ts` returns null for the rest of the suite). It
covers the per-frame draw, the smaller mobile particle budget, the
reduced-motion and hidden-tab bail-outs, a `getContext` that returns null or
throws, and the unmount path, since a leaked loop would keep drawing on a
detached canvas for the life of the tab.

`tests/unit/app-shell.test.tsx` renders `_app` around a stub page, including one
that throws, to pin that the skip link's `#main` target survives a render error.
`ErrorBoundary`'s reload handler is the one line left uncovered: jsdom makes
`window.location` non-configurable and refuses to let `reload` be intercepted,
so only the button's wiring is asserted.

`tests/unit/reduced-motion-hook.test.tsx` covers `usePrefersReducedMotion`,
including the deprecated `addListener` API that Safari below 14 is the only
browser to expose. `tests/unit/layout.test.tsx` covers the presentational
components and their variant branches, and `tests/unit/homepage.test.tsx` covers
the hero call to action, hover-to-pause on the feature carousel, and the FAQ
disclosures opening independently rather than as an accordion.

`components/TypingEffect.tsx` and `components/LoadingScreen.tsx` have no import
site anywhere in the app and so sit at 0%. Tests against them would raise the
coverage number without testing anything that ships; they are left reported as
dead code instead.

The Tests workflow runs on PRs and main/test branch pushes with read-only repository
permissions and no deployment steps. Existing deployment configuration is unchanged.
