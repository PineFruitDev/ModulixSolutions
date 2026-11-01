import fs from 'fs';
import path from 'path';

import {
  CSP,
  CSP_DIRECTIVES,
  DISABLED_FEATURES,
  FORM_ENDPOINT,
  META_CSP,
  META_UNSUPPORTED_DIRECTIVES,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
  SECURITY_HEADERS,
  buildCsp,
  buildHeadersFile,
} from '../../lib/security-headers';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

/** Parse a serialised policy back into a directive map. */
const parseCsp = (policy: string) =>
  Object.fromEntries(
    policy.split(';').map(part => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    })
  );

describe('the headers file', () => {
  // Byte-compared rather than spot-checked, the same way public/sitemap.xml is
  // compared against the route manifest. Editing the file by hand and leaving
  // lib/security-headers.ts behind fails here instead of shipping a policy
  // nothing in the codebase describes.
  test('public/_headers is exactly what the module generates', () => {
    expect(read('public/_headers')).toBe(buildHeadersFile());
  });

  test('the policy is attached to every path, not just the document', () => {
    // A CSP scoped to /*.html would leave the chunks and fonts uncovered, and
    // nosniff has to reach the assets to be worth sending at all.
    expect(buildHeadersFile().startsWith('/*\n')).toBe(true);
  });

  test('every header is one indented "Name: value" line', () => {
    const [, ...lines] = buildHeadersFile().trimEnd().split('\n');
    expect(lines).toHaveLength(Object.keys(SECURITY_HEADERS).length);
    lines.forEach(line => expect(line).toMatch(/^ {2}[A-Za-z-]+: \S.*$/));
  });
});

describe('the header set', () => {
  test.each([
    'Content-Security-Policy',
    'Referrer-Policy',
    'X-Content-Type-Options',
    'Permissions-Policy',
    'Strict-Transport-Security',
    'X-Frame-Options',
    'Cross-Origin-Opener-Policy',
  ])('%s is configured', header => {
    expect(SECURITY_HEADERS[header]).toBeTruthy();
  });

  test('nosniff is the only meaningful value for the content type header', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  test('the referrer policy does not leak paths cross-origin', () => {
    // no-referrer-when-downgrade and unsafe-url both send the full URL to
    // other origins; strict-origin-when-cross-origin sends only the origin.
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(REFERRER_POLICY).toBe(SECURITY_HEADERS['Referrer-Policy']);
  });

  test('HSTS lasts long enough to be preloadable', () => {
    const hsts = SECURITY_HEADERS['Strict-Transport-Security'];
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
    expect(hsts).toContain('includeSubDomains');
  });

  test('framing is refused by header as well as by policy', () => {
    // X-Frame-Options is redundant with frame-ancestors on a current browser
    // and is kept for the ones where it is not.
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(CSP_DIRECTIVES['frame-ancestors']).toEqual(["'none'"]);
  });

  test('the existing foundation marker is still sent', () => {
    expect(SECURITY_HEADERS['X-Modulix-Foundation']).toBe('1.1.0');
  });
});

describe('permissions policy', () => {
  test('every listed feature is denied to everyone', () => {
    const entries = PERMISSIONS_POLICY.split(', ');
    expect(entries).toHaveLength(DISABLED_FEATURES.length);
    entries.forEach(entry => expect(entry).toMatch(/^[a-z-]+=\(\)$/));
  });

  test('the features the site must never reach for are covered', () => {
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(PERMISSIONS_POLICY).toContain(`${feature}=()`);
    }
  });

  test('no feature is listed twice', () => {
    expect(new Set(DISABLED_FEATURES).size).toBe(DISABLED_FEATURES.length);
  });
});

describe('content security policy', () => {
  const directives = parseCsp(CSP);

  test('it falls back closed', () => {
    expect(directives['default-src']).toEqual(["'self'"]);
  });

  test.each(['default-src', 'script-src', 'style-src', 'img-src', 'font-src', 'connect-src'])(
    '%s is set explicitly rather than inherited',
    name => {
      expect(CSP_DIRECTIVES[name]).toBeDefined();
    }
  );

  test('the directives default-src cannot cover are pinned shut', () => {
    // base-uri and form-action do not fall back to default-src, so omitting
    // them leaves a base tag rewrite and a cross-site form post available.
    expect(directives['base-uri']).toEqual(["'self'"]);
    expect(directives['form-action']).toEqual(["'self'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['frame-src']).toEqual(["'none'"]);
  });

  test('no directive allows eval, and scripts do not allow inline', () => {
    expect(CSP).not.toContain("'unsafe-eval'");
    expect(CSP).not.toContain("'unsafe-hashes'");
    expect(directives['script-src']).not.toContain("'unsafe-inline'");
  });

  test("inline style is allowed, because Framer Motion's initial values need it", () => {
    // Asserted so that the allowance stays a deliberate, explained exception
    // rather than something that quietly spreads to script-src.
    expect(directives['style-src']).toContain("'unsafe-inline'");
    expect(directives['style-src']).toContain("'self'");
  });

  test('nothing is allowed from a wildcard or an insecure origin', () => {
    const sources = Object.values(CSP_DIRECTIVES).flat();
    expect(sources).not.toContain('*');
    sources.forEach(source => {
      expect(source).not.toMatch(/^http:/);
      expect(source).not.toMatch(/^\*/);
      if (source.includes('://')) expect(source.startsWith('https://')).toBe(true);
    });
  });

  test('fonts and images are first-party only', () => {
    // next/font/google self-hosts Inter and Lato into /_next/static/media at
    // build time, so an allowance for Google's font CDNs would match nothing.
    expect(directives['font-src']).toEqual(["'self'"]);
    expect(CSP).not.toContain('fonts.googleapis.com');
    expect(CSP).not.toContain('fonts.gstatic.com');
    // data: is for the hex background SVGs inlined in styles/globals.css.
    expect(directives['img-src']).toEqual(["'self'", 'data:']);
    expect(directives['img-src']).not.toContain('https:');
  });

  test('upgrade-insecure-requests is serialised as a bare directive', () => {
    expect(CSP.endsWith('upgrade-insecure-requests')).toBe(true);
    expect(CSP).not.toContain('upgrade-insecure-requests ;');
  });

  test('connect-src allows exactly the endpoint the contact form posts to', () => {
    // The drift guard that matters most: a policy of connect-src 'self' alone
    // blocks the inquiry fetch, and that is the state this file replaced.
    expect(directives['connect-src']).toEqual(["'self'", FORM_ENDPOINT]);
    expect(read('components/ContactForm.tsx')).toContain(`fetch('${FORM_ENDPOINT}/submit'`);
  });

  test('every external origin in the policy is used by the source', () => {
    const external = Object.values(CSP_DIRECTIVES)
      .flat()
      .filter(source => source.includes('://'));
    expect(external).toEqual([FORM_ENDPOINT]);
  });
});

describe('the policy embedded in the document', () => {
  test('it drops only the directives markup cannot express', () => {
    expect(META_UNSUPPORTED_DIRECTIVES).toEqual(['frame-ancestors']);
    expect(META_CSP).not.toContain('frame-ancestors');
    // Everything else survives, so the meta copy is not quietly weaker.
    const header = parseCsp(CSP);
    const meta = parseCsp(META_CSP);
    for (const name of Object.keys(header)) {
      if (META_UNSUPPORTED_DIRECTIVES.includes(name)) continue;
      expect(meta[name]).toEqual(header[name]);
    }
  });

  test('_document renders the generated policy rather than a copy of it', () => {
    // next/head renders nothing under jsdom, so the document source is checked
    // here and the built HTML is asserted in tests/smoke/security-headers.spec.ts.
    const document = read('pages/_document.tsx');
    expect(document).toContain("from '../lib/security-headers'");
    expect(document).toContain('httpEquiv="Content-Security-Policy"');
    expect(document).toContain('content={META_CSP}');
    expect(document).toContain('content={REFERRER_POLICY}');
    // A literal policy string in the document would defeat the drift guard.
    expect(document).not.toContain('default-src');
  });
});

describe('buildCsp', () => {
  test('it omits the directives it is asked to omit', () => {
    expect(buildCsp({ 'default-src': ["'self'"], 'object-src': ["'none'"] }, ['object-src'])).toBe(
      "default-src 'self'"
    );
  });

  test('a valueless directive serialises without a trailing space', () => {
    expect(buildCsp({ 'upgrade-insecure-requests': [] })).toBe('upgrade-insecure-requests');
  });
});
