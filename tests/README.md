# Tests

Use Node 22 and `npm ci`.

- `npm test`: isolated Jest/Testing Library component tests.
- `npm run test:coverage`: the same suite, plus a coverage report and the
  thresholds in `jest.config.js`. This is what CI runs.
- `npm run type-check`: TypeScript validation.
- `npx playwright install chromium`: install the smoke-test browser.
- `npm run test:smoke`: build the static export and test it on localhost port
  3100. This runs three projects: `desktop`, `mobile` and `responsive`. Add
  `-- --project=responsive` to run only the viewport suite.

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

`tests/unit/seo.test.tsx` covers the metadata layer in `lib/seo`: canonical URLs
keeping their exported trailing slash, `og:url` matching the canonical, titles
and descriptions matching their Open Graph and Twitter copies, card image size
and alt text, the default indexable robots value against a utility page's
`noindex`, and no tag being emitted twice. It also checks `public/sitemap.xml`
is byte-identical to what the route manifest generates, that noindex routes stay
out of it, that every listed route has a page behind it, and that `og-image.jpg`
really is 1200x630. `next/head` renders nothing under jsdom, which is why the
tag set is built by a pure function and asserted there rather than in the DOM.

`tests/unit/security-headers.test.tsx` covers the policy in
`lib/security-headers.ts`: `public/_headers` byte-compared against
`buildHeadersFile()` the same way the sitemap is compared against its route
manifest, the required headers being present, HSTS being long enough to
preload, every permissions-policy feature being denied to everyone, and the
CSP's own shape. The shape assertions are the ones with teeth: `default-src`
falling back closed, the directives that do not inherit from it (`base-uri`,
`form-action`, `frame-ancestors`, `object-src`) being pinned shut, no `eval`
and no inline script, no wildcard or `http:` source, and the meta copy
dropping only `frame-ancestors`, which markup cannot express. Two guards exist
to catch drift rather than a bad value: `connect-src` is checked against the
endpoint `components/ContactForm.tsx` actually fetches, because a policy of
`'self'` alone blocks the inquiry and that is the state this work replaced, and
every external origin in the policy must be that same endpoint, so an
allowance outliving its caller fails. `pages/_document.tsx` is checked by
source, not by render, because `next/head` renders nothing under jsdom.

`tests/smoke/security-headers.spec.ts` is what proves the policy is survivable
rather than merely configured. It loads the export in Chromium with the meta
policy enforced, collecting `securitypolicyviolation` events from an init
script so a violation raised during the initial parse is still caught, and
asserts none occur on the homepage or any status page. The homepage case
asserts the things a too-strict directive would break: a FAQ disclosure
opening, which cannot happen unless the bundles executed and hydrated, so a
blocked script fails here instead of passing against prerendered HTML; the
stylesheet being applied rather than only fetched; `document.fonts` reporting a
loaded face, since `next/font` self-hosts Inter and Lato; and both image source
kinds decoding. The images are requested from script rather than asserted
against the carousel's own `img` elements, which are `loading="lazy"` and
render at 0x0 on the mobile project, where their `naturalWidth` stays 0 whatever
the policy says. A synthetic inquiry covers `connect-src`, since a CSP block
aborts the fetch before Playwright's route handler is reached. The last case is
the inverse: an injected inline script must not run and must be reported, so a
policy accidentally relaxed to `'unsafe-inline'` cannot pass the rest of the
file. Both that case and the unit suite were confirmed to fail against a
deliberately relaxed `script-src`.

`tests/smoke/responsive.spec.ts` is the viewport suite, run as its own
Playwright project because it drives the viewport itself: under the `desktop`
or `mobile` projects every case would re-run at a width it was not written
for, and `iPhone 13` would additionally impose `isMobile`. The two device
projects exclude it in return. It checks 360, 768 and 1280, the three widths
the layout actually changes at, and every case measures the built export in
Chromium after walking the page so the `whileInView` reveals have settled.
Measuring before that reads the pre-reveal geometry, where much of the page is
still at `opacity: 0` and its own offset transform.

It asserts no page scrolls sideways, no control resolves below 44px, no text
renders under 12px, the hero fits a 360x640 phone with its call to action above
the fold, no carousel slide outgrows its track or reaches the stepper row, the
track does not resize when the slide changes, and no paragraph exceeds 90
characters to the line at 1280.

The tap-target assertion is the one that needed care. Controls carrying their
reach in a `.tap-target` overlay paint smaller than they measure, and neither
`getBoundingClientRect` nor `elementFromPoint` reports that overlay:
`elementFromPoint` returns an ancestor, because a pseudo-element is not an
element. Real clicks do land on it, which was confirmed before relying on it.
So the geometry case reads the overlay's resolved size out of the engine and
counts it only when it is absolutely positioned against a control that is
itself positioned, since a 44px box anchored to some ancestor instead covers
everything but its own control. A separate behavioural case clicks 21px above
the centre of a 36px stepper, outside the painted box and inside the overlay,
and fails if the control does not advance. Without it the geometry cases would
be trusting a mechanism nothing proves still works.

Each assertion was confirmed to fail against the bug it replaces: the fixed
380px carousel track, the hero's nested `min-h-screen`, the uncapped hero
paragraph, the `.tap-target` overlay removed outright, and the overlay left
sized but unanchored.

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
