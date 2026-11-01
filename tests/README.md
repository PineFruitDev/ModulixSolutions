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
tag, and the links back into the site. They also cover the end-to-end journeys
across those pieces: every primary nav target, fragment entry, the links out of
a dead end, and the inquiry's failure, retry and double-submit paths. They block
external requests by default and never submit a real inquiry. Tracing is disabled to avoid retaining form
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

`tests/smoke/journeys.spec.ts` covers the ways a visitor reaches a section:
every in-page item in the primary nav rather than one of them, a `Home` click
from a scrolled page, a shared link that already carries the fragment, the two
links off the 404, and the footer logo back to the homepage from a status page.
The nav cases assert that the section comes to rest clear of the fixed bar,
polling because the hand-written animation advances on `requestAnimationFrame`
and a headless browser throttles it hard. The helper allows the same 24px that
`keyboard.spec.ts` does, for the vertical transform a revealed section keeps,
and has one escape hatch: the last section on the page cannot be pulled up to
the bar because the document runs out of scroll first, so being at maximum
scroll with the section on screen also counts as arrived. That hatch was
checked against a deliberately zeroed header offset, which fails all five
sections including `#faq` with the measured clearance in the message, so it is
not quietly rescuing a real regression. `#modulix-bot` is the reason the nav
cases are a loop: its id is the only one that does not match its label. The
fragment cases assert only that the right section is in view, because the
browser's native jump aligns it with the top of the viewport and leaves the bar
overlapping its heading; that is current behaviour and is noted rather than
asserted as clearance. `#hero` is excluded from the clearance invariant
entirely, being full-bleed under the translucent bar by design.

`tests/smoke/contact-flow.spec.ts` covers the inquiry past the happy path that
`pages.spec.ts` owns. The status machine itself is unit-tested with a stubbed
fetch and fake timers and is not repeated; what is left for a browser is a
failure leaving the visitor on the page with every field still filled and a
retry that then reaches the confirmation, a double-click producing one
submission rather than two, an unusable optional Discord username stopping the
inquiry before it is sent, and the whole path on a phone viewport from the
drawer to the confirmation. The double-click case holds the response open so
the second click lands while the first request is genuinely in flight, which is
a race fake timers cannot present; its in-flight assertion is soft so that a
regression reports both the enabled control and the duplicate request count,
and removing `isSubmitting` from the button's disabled rule was confirmed to
POST twice. The Discord case pins that nothing is sent and nothing typed is
lost; it is the one place the form invites a submission it then refuses, since
Discord is left out of the rule that disables Send, and the error it refuses
with talks about required fields when the field is optional. That copy is worth
tightening separately and the test deliberately does not assert it is right.
The form's status region is addressed within `#contact` because Next's route
announcer is also `role="alert"` and a page-wide query matches both.

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
