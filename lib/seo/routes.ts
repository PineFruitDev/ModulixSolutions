import { absoluteUrl } from './site';

export interface SiteRoute {
  /** Path as exported, matching this page's canonical URL exactly. */
  path: string;
  /** Indexable routes belong in the sitemap; the rest send noindex instead. */
  indexable: boolean;
}

/**
 * Every page the static export produces.
 *
 * Listing a page here is the only step: the sitemap is generated from this list
 * and a unit test fails if public/sitemap.xml falls behind it, so the two
 * cannot drift the way a hand-maintained sitemap does.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [
  { path: '/', indexable: true },
  { path: '/contact-confirmed/', indexable: false },
  { path: '/500/', indexable: false },
  // Served flat by GitHub Pages for any missing route, so that is both the path
  // it is reached at and the path its canonical URL has to use.
  { path: '/404.html', indexable: false },
];

export const INDEXABLE_ROUTES = SITE_ROUTES.filter((route) => route.indexable);

/**
 * Builds the contents of public/sitemap.xml. Byte-exact on purpose: a unit test
 * diffs the committed file against this, so when a route is added the test
 * fails and prints the XML to copy into public/sitemap.xml. The site exports
 * statically to GitHub Pages, so there is no request-time route to serve this
 * from and no build step is worth adding for a handful of URLs.
 */
export function buildSitemapXml(): string {
  const entries = INDEXABLE_ROUTES.map(
    (route) => `  <url>\n    <loc>${absoluteUrl(route.path)}</loc>\n  </url>`
  ).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}
