# Tests

Use Node 22 and `npm ci`.

- `npm test`: isolated Jest/Testing Library component tests.
- `npm run type-check`: TypeScript validation.
- `npx playwright install chromium`: install the smoke-test browser.
- `npm run test:smoke`: build the static export and test it on localhost port 3100.

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

`tests/unit/states.test.tsx` covers the shared state components: which tones
interrupt with `role="alert"` versus announce politely, the busy flag on the
loading tone, error-boundary containment and recovery, the company logo
fallback, and the contact form's status machine. The post-success redirect is
asserted in the browser suite instead, because jsdom neither implements that
navigation nor allows `window.location` to be replaced.

The Tests workflow runs on PRs and main/test branch pushes with read-only repository
permissions and no deployment steps. Existing deployment configuration is unchanged.
