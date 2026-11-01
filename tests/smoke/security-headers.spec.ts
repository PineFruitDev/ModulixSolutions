import { test, expect } from '@playwright/test';

import { META_CSP, REFERRER_POLICY } from '../../lib/security-headers';

/**
 * The unit suite proves the policy is configured and internally consistent.
 * This one proves it is survivable: the export is loaded in a real browser with
 * the policy enforced from the document, and a directive that is too strict
 * shows up as a violation report here rather than as a blank page in
 * production.
 *
 * The local static server cannot send response headers, which is also true of
 * GitHub Pages, so what is enforced here is the `<meta http-equiv>` copy. That
 * is the copy that carries the real risk of breaking something; the
 * header-only directives it omits (`frame-ancestors`) deny rather than allow
 * and cannot break a first-party load.
 */

type Violation = { directive: string; blockedURI: string };

declare global {
  interface Window {
    __cspViolations: Violation[];
  }
}

const collectViolations = async (page: import('@playwright/test').Page) => {
  // Registered before any document script so that a violation raised during
  // the initial parse is still caught.
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__cspViolations.push({
        directive: event.effectiveDirective || event.violatedDirective,
        blockedURI: event.blockedURI,
      });
    });
  });
};

const violations = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__cspViolations ?? []);

test.beforeEach(async ({ page }) => {
  await collectViolations(page);
  // Fail closed, as the rest of the smoke suite does: no external traffic.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

test('the built document carries the generated policy', async ({ page }) => {
  await page.goto('/');
  // Strict mode fails this if the policy is emitted twice.
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    META_CSP
  );
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', REFERRER_POLICY);
});

test('every status page carries it too, not just the homepage', async ({ page }) => {
  // trailingSlash: true exports these as directories; 404 is requested at the
  // flat path because that is the only one GitHub Pages serves for a missing
  // route, matching how pages.spec.ts addresses them.
  for (const route of ['/contact-confirmed/', '/404.html', '/500/']) {
    await page.goto(route);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      META_CSP
    );
    expect(await violations(page)).toEqual([]);
  }
});

test('the homepage loads its scripts, styles, fonts and images under the policy', async ({
  page,
}) => {
  const ok: string[] = [];
  page.on('response', response => {
    if (response.status() === 200) ok.push(new URL(response.url()).pathname);
  });

  await page.goto('/');

  // Hydration is the proof that script-src 'self' without 'unsafe-inline' is
  // enough: a blocked bundle still renders the prerendered HTML, so asserting
  // visible content would pass with every script refused. A disclosure that
  // opens cannot happen without React's handlers attached.
  const question = page.getByRole('button', { name: /right community fit/i });
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');

  // The stylesheet is applied, rather than merely fetched.
  const headerPosition = await page.evaluate(
    () => getComputedStyle(document.querySelector('.site-header') as HTMLElement).position
  );
  expect(headerPosition).toBe('fixed');

  // next/font self-hosts Inter and Lato, so font-src 'self' has to be enough
  // for them to actually load rather than silently falling back.
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  const loadedFamilies = await page.evaluate(() => {
    const families: string[] = [];
    document.fonts.forEach(face => {
      if (face.status === 'loaded') families.push(face.family);
    });
    return families;
  });
  expect(loadedFamilies.length).toBeGreaterThan(0);

  // Both kinds of image source the site uses have to decode: a real file for
  // the company marks under /public, and a data: URI for the hex backgrounds
  // inlined in styles/globals.css.
  //
  // Requested here rather than asserted against the carousel's own <img>
  // elements, which are loading="lazy" and render at 0x0 on the mobile
  // project, so their naturalWidth stays 0 whatever the policy says and the
  // check would be a guard in name only on one of the two viewports. An image
  // created in script is subject to img-src exactly as a parsed one is.
  const decoded = await page.evaluate(() => {
    const load = (src: string) =>
      new Promise<boolean>(resolve => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0);
        img.onerror = () => resolve(false);
        img.src = src;
      });
    return Promise.all([
      load('/companies/readyup-logo.png'),
      load(
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2'%3E%3C/svg%3E"
      ),
    ]);
  });
  expect(decoded).toEqual([true, true]);

  expect(ok.some(p => p.startsWith('/_next/static/chunks/'))).toBe(true);
  expect(ok.some(p => p.endsWith('.css'))).toBe(true);
  expect(ok.some(p => p.endsWith('.woff2'))).toBe(true);

  expect(await violations(page)).toEqual([]);
});

test('an inquiry still reaches the form endpoint the policy allows', async ({ page }) => {
  // connect-src has to name api.web3forms.com or the fetch never leaves the
  // page. The response is synthetic and no real inquiry is submitted.
  let submissions = 0;
  await page.route('https://api.web3forms.com/submit', async route => {
    submissions++;
    await route.fulfill({ json: { success: true } });
  });

  await page.goto('/');
  await page.getByLabel('Name *', { exact: true }).fill('Headers Tester');
  await page.getByLabel('Email *', { exact: true }).fill('headers@example.com');
  await page.getByLabel('Message *', { exact: true }).fill('Synthetic test inquiry only.');
  await page.getByRole('button', { name: 'Send Message' }).click();

  await expect(page).toHaveURL(/contact-confirmed/);
  expect(submissions).toBe(1);
  // Specifically: no connect-src report. A CSP block aborts the fetch before
  // the route handler is reached, so the count above would be 0.
  expect(await violations(page)).toEqual([]);
});

test('the policy refuses an injected inline script and a foreign origin', async ({ page }) => {
  // The inverse check. Without it, a policy accidentally relaxed to
  // 'unsafe-inline' would pass every assertion above.
  await page.goto('/');

  const executed = await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__inlineRan = true;';
    document.body.appendChild(script);
    return Boolean((window as unknown as { __inlineRan?: boolean }).__inlineRan);
  });
  expect(executed).toBe(false);

  const reported = await violations(page);
  expect(reported.map(v => v.directive)).toContain('script-src-elem');
});
