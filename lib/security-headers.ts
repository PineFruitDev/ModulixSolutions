/**
 * The one definition of the site's HTTP security headers.
 *
 * There are two delivery paths, because there are two kinds of host:
 *
 *  - `public/_headers` is read by Cloudflare Pages and Netlify style hosts and
 *    is the only path that can carry a real response header, so it is the only
 *    path that can carry `frame-ancestors`, `X-Content-Type-Options`,
 *    `Permissions-Policy` or HSTS.
 *  - the `<meta http-equiv>` in `pages/_document.tsx` is the only path that
 *    does anything on GitHub Pages, which is where this site is actually
 *    deployed (`.github/workflows/deploy.yml`) and which serves static files
 *    with no way to configure response headers at all.
 *
 * Neither path is sufficient alone, so both are generated from here and
 * `tests/unit/security-headers.test.tsx` asserts the file and the document
 * still match this module. The headers file is byte-compared against
 * `buildHeadersFile()` the same way `public/sitemap.xml` is compared against
 * the route manifest: an edit to the file alone fails rather than drifts.
 */

/** Where `components/ContactForm.tsx` posts an inquiry. */
export const FORM_ENDPOINT = 'https://api.web3forms.com';

/** The `_headers` path pattern the policy is attached to. */
export const HEADERS_PATH_PATTERN = '/*';

/**
 * Directives, in the order they are serialised.
 *
 * Every allowance here is one the built output was checked to need, and the
 * ones that used to be here and are not any more were checked to be dead:
 *
 *  - `script-src` carries no `'unsafe-inline'`. The export's only inline
 *    scripts are `__NEXT_DATA__` (`application/json`) and the JSON-LD block in
 *    `components/Seo.tsx` (`application/ld+json`). Neither is an executable
 *    script type, so neither is subject to the inline check, and every real
 *    script is a file under `/_next/static/chunks/`.
 *  - `style-src` does carry it, and has to. Framer Motion's server-rendered
 *    initial values land as inline `style` attributes, 161 of them on the
 *    homepage alone, and those are covered by `style-src-attr` falling back to
 *    `style-src`.
 *  - `font-src` is `'self'` only. `next/font/google` downloads Inter and Lato
 *    at build time and emits them under `/_next/static/media/`, so the old
 *    `https://fonts.gstatic.com` and `https://fonts.googleapis.com`
 *    allowances never matched a request the site makes.
 *  - `img-src` needs `data:` for the hex background SVGs inlined in
 *    `styles/globals.css`. Every other image is a local file under `/public`,
 *    so the old blanket `https:` is gone.
 *  - `connect-src` has to name the form endpoint. The previous `'self'`-only
 *    value would have blocked the contact form outright, which went unnoticed
 *    because GitHub Pages never applied the policy.
 */
export const CSP_DIRECTIVES: Record<string, readonly string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", FORM_ENDPOINT],
  // The form is submitted with fetch and never natively, so 'self' covers the
  // redirect to /contact-confirmed/ without also licensing a cross-site POST.
  'form-action': ["'self'"],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  // Valueless, so it serialises as the bare directive name.
  'upgrade-insecure-requests': [],
};

/**
 * Directives a `<meta http-equiv>` policy cannot express. The CSP spec has the
 * browser ignore these when they arrive in markup, and Chrome and Firefox both
 * log a console warning naming them, so they are dropped from the meta copy
 * rather than carried along to be ignored noisily.
 *
 * `frame-ancestors` being header-only is the reason `X-Frame-Options` is still
 * sent: on a host that honours `_headers` they overlap, and on GitHub Pages
 * neither applies and the site has no clickjacking protection. That gap is
 * real and is documented in the README rather than papered over.
 */
export const META_UNSUPPORTED_DIRECTIVES: readonly string[] = ['frame-ancestors'];

/**
 * Browser features the site does not use. Denying each with an empty allowlist
 * also denies it to anything the site embeds, which is why the list is longer
 * than the set of APIs the first-party code could plausibly reach for.
 */
export const DISABLED_FEATURES: readonly string[] = [
  'accelerometer',
  'autoplay',
  'bluetooth',
  'camera',
  'display-capture',
  'encrypted-media',
  'geolocation',
  'gyroscope',
  'hid',
  'idle-detection',
  'magnetometer',
  'microphone',
  'midi',
  'payment',
  'publickey-credentials-get',
  'screen-wake-lock',
  'serial',
  'usb',
  'xr-spatial-tracking',
];

/** Serialise a directive map, dropping the ones named in `omit`. */
export function buildCsp(
  directives: Record<string, readonly string[]> = CSP_DIRECTIVES,
  omit: readonly string[] = []
): string {
  return Object.entries(directives)
    .filter(([name]) => !omit.includes(name))
    .map(([name, values]) => (values.length === 0 ? name : `${name} ${values.join(' ')}`))
    .join('; ');
}

/** The policy sent as a response header, including the header-only directives. */
export const CSP = buildCsp();

/** The policy embedded in the document, without the directives markup ignores. */
export const META_CSP = buildCsp(CSP_DIRECTIVES, META_UNSUPPORTED_DIRECTIVES);

export const PERMISSIONS_POLICY = DISABLED_FEATURES.map(feature => `${feature}=()`).join(', ');

export const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * The full header set, in the order it is written to `public/_headers`.
 *
 * `X-Modulix-Foundation` is not a security header; it is the existing
 * foundation version marker and is kept so the response is unchanged in that
 * respect.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': REFERRER_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Content-Security-Policy': CSP,
  'X-Modulix-Foundation': '1.1.0',
};

/**
 * The rest of `public/_headers`: the note about the file not being in force on
 * the current host, and the cache-control rules.
 *
 * This lives here because `buildHeadersFile()` is byte-compared against the
 * committed file. The security block and the caching rules arrived in two
 * changes that did not know about each other, and a generator covering only
 * the security block is what made that comparison fail once both had landed.
 * Anything in the file has to be generated from here, security header or not.
 */
const HEADERS_FILE_TAIL = `
# NOT IN FORCE ON THE CURRENT HOST.
#
# _headers is a Cloudflare Pages and Netlify convention. This site deploys to
# GitHub Pages (.github/workflows/deploy.yml), which serves static files with
# its own fixed headers and ignores this file completely, so everything here
# (including the security block above, which predates these rules) is staged
# for a host that reads it rather than active today. On GitHub Pages the
# hashed bundle comes back with max-age=600, and there is no supported way to
# change that from inside the repo.
#
# Kept and extended rather than deleted so the policy is reviewed in one place
# and is correct on the day the host moves.

# Everything under /_next/static carries a content hash in its filename, so a
# changed file is a changed URL and the response never needs revalidating.
# Covers the JS chunks and the self-hosted next/font woff2 files.
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

# Images ship under stable, unhashed names, so they get a week in cache plus a
# month of stale-while-revalidate rather than immutability: a replaced logo
# still rolls out on its own. The splat crosses path separators, so these also
# cover /companies/*-logo.png.
/*.png
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000
/*.jpg
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000
/*.ico
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000
/*.svg
  Cache-Control: public, max-age=604800, stale-while-revalidate=2592000

# Discovery and structured-data files: robots.txt, sitemap.xml, security.txt,
# llms.txt, llms-full.txt and modulix-node.json, plus the /.well-known copies,
# which the splat reaches because it crosses path separators. These carried no
# Cache-Control at all and fell back to whatever default the host picked. An
# hour is short enough that a corrected robots rule or a new sitemap entry is
# live the same day, and a day of stale-while-revalidate means a crawler never
# blocks on the revalidation.
#
# The woff2 files need no rule of their own: next/font emits them under
# /_next/static/media, which the immutable rule above already covers.
/*.txt
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
/*.xml
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
/*.json
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

# Documents revalidate so a deploy is picked up immediately while the
# subresources they point at stay cached. next.config.js sets trailingSlash,
# so the pages are served as / and /contact-confirmed/ rather than *.html;
# these are matched by directory, with /404.html named for the exported
# not-found page.
/
  Cache-Control: public, max-age=0, must-revalidate
/*/
  Cache-Control: public, max-age=0, must-revalidate
/404.html
  Cache-Control: public, max-age=0, must-revalidate
`;

/** Render `public/_headers` in full, trailing newline included. */
export function buildHeadersFile(): string {
  const lines = Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`);
  return `${HEADERS_PATH_PATTERN}\n${lines.join('\n')}\n${HEADERS_FILE_TAIL}`;
}
