import { test, expect } from '@playwright/test';

import { SITE_ROUTES } from '../../lib/seo/routes';

test.beforeEach(async ({ page }) => {
  // Fail closed: no external traffic, including accidental real form submissions.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

// Every page's head now comes from one component, so it is worth asserting
// against the built HTML and not only against the function that feeds it.
// Playwright's strict mode fails these if a tag is emitted twice.
test('the homepage is indexable and declares one canonical URL', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://modulixsolutions.com/'
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://modulixsolutions.com/'
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    'width=device-width, initial-scale=1'
  );
});

test('homepage renders key sections and contact form', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Modulix/i);
  for (const id of ['hero', 'about', 'services', 'contact', 'faq']) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.getByRole('button', { name: 'Send Message' })).toBeDisabled();
});

test('valid inquiry submits once and reaches confirmation', async ({ page }) => {
  let submissions = 0;
  await page.route('https://api.web3forms.com/submit', async route => {
    submissions++;
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: { success: true } });
  });
  await page.goto('/');
  await page.getByLabel('Name *', { exact: true }).fill('Smoke Tester');
  await page.getByLabel('Email *', { exact: true }).fill('smoke@example.com');
  await page.getByLabel('Message *', { exact: true }).fill('Synthetic test inquiry only.');
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page).toHaveURL(/\/contact-confirmed\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("We'll Contact You Soon");
  expect(submissions).toBe(1);
});

// 404 is checked at the flat path because that is the only one GitHub Pages
// serves for a missing route. trailingSlash exports every other page, 500
// included, as a directory index.
const statusPages = [
  ['/contact-confirmed/', "We'll Contact You Soon"],
  ['/404.html', '404 Error - Page Not Found'],
  ['/500/', 'Something Went Wrong'],
];

for (const [path, heading] of statusPages) {
  test(`${path} renders and returns home`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    // An anchor, not a button nested inside one: crawlable and keyboard-operable.
    await page.getByRole('link', { name: /Return to Homepage/ }).click();
    await expect(page).toHaveURL('/');
  });

  test(`${path} stays out of the index`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/
    );
    // Self-referencing, so it cannot point the noindex at a page meant to rank.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://modulixsolutions.com${path}`
    );
  });
}

// The unit tests check the functions that build the metadata. These check what
// the export actually ships, which is the only thing a crawler sees: the whole
// chain from the route manifest through next/head and into the built HTML.
test('every exported page ships the title and description the manifest holds', async ({
  page,
}) => {
  for (const route of SITE_ROUTES) {
    await page.goto(route.path);
    await expect(page).toHaveTitle(route.title);
    // Strict mode: a second copy of either tag fails this rather than being
    // silently preferred by one crawler and not another.
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      route.description
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      route.title
    );
  }
});

test('the homepage ships exactly one JSON-LD block and it parses', async ({ page }) => {
  await page.goto('/');

  const blocks = page.locator('script[type="application/ld+json"]');
  // Two blocks is the state where one is stale and which one wins is a
  // crawler's choice.
  await expect(blocks).toHaveCount(1);

  const graph = JSON.parse((await blocks.innerText()) ?? '');
  expect(graph['@context']).toBe('https://schema.org');
  expect(
    graph['@graph'].map((node: { '@type': string }) => node['@type']).sort()
  ).toEqual(['FAQPage', 'Organization', 'Person', 'WebPage', 'WebSite']);

  // The graph is embedded in the document rather than fetched as JSON, so
  // anything in the chain is free to escape what it writes. These check the
  // strings came back intact: a description that round-tripped through HTML
  // escaping would arrive holding an entity, and the apostrophes in the FAQ
  // answers are the characters most likely to pick one up.
  const home = SITE_ROUTES.find(route => route.path === '/')!;
  const webPage = graph['@graph'].find(
    (node: { '@type': string }) => node['@type'] === 'WebPage'
  );
  expect(webPage.name).toBe(home.title);
  expect(webPage.description).toBe(home.description);

  const strings = JSON.stringify(graph);
  // A parsed value still holding an entity means it was escaped twice: once
  // into the document and not undone on the way out.
  expect(strings).not.toMatch(/&(amp|quot|apos|lt|gt|#\d+);/);
  // And the escaping did not leave its own markers behind as literal text.
  expect(strings).not.toContain('\\\\u003c');
});

test('the exported 404 links back into the site, not just to the homepage', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.getByRole('link', { name: /Browse services/ })).toHaveAttribute(
    'href',
    '/#services'
  );
  await page.getByRole('link', { name: /Get in touch/ }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('#contact')).toBeAttached();
});
