import type { PageMetaInput } from './meta';
import { absoluteUrl } from './site';

export interface SiteRoute {
  /** Path as exported, matching this page's canonical URL exactly. */
  path: string;
  /** Indexable routes belong in the sitemap; the rest send noindex instead. */
  indexable: boolean;
  /** Document title. Reused verbatim as og:title and twitter:title. */
  title: string;
  /** Meta description. Reused as og:description and twitter:description. */
  description: string;
}

/**
 * Every page the static export produces, with the title and description it
 * ships.
 *
 * Listing a page here is the only step: the sitemap is generated from this
 * list, `<Seo>` reads a page's whole head from it, and unit tests fail if
 * public/sitemap.xml falls behind, if a route has no page (or a page no
 * route), or if a title or description is too long to survive a search result.
 * Keeping the strings here rather than in each page is what makes those length
 * and uniqueness checks possible without rendering anything.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [
  {
    path: '/',
    indexable: true,
    title: 'Modulix Solutions | Discord, Creator and UGC Growth Systems',
    description:
      'Modulix builds community infrastructure, creator programmes and brand activations across Discord and the wider user-generated content space.',
  },
  {
    path: '/contact-confirmed/',
    indexable: false,
    title: 'Message Sent Successfully | Modulix Solutions',
    description:
      "Thank you for contacting Modulix Solutions. Your message has been sent successfully and we'll get back to you within 24 hours.",
  },
  {
    path: '/500/',
    indexable: false,
    title: 'Something Went Wrong | Modulix Solutions',
    description:
      'An unexpected error stopped this page from loading. Reload it, return to the Modulix Solutions homepage, or contact us directly.',
  },
  // Served flat by GitHub Pages for any missing route, so that is both the path
  // it is reached at and the path its canonical URL has to use.
  {
    path: '/404.html',
    indexable: false,
    title: '404 Error - Page Not Found | Modulix Solutions',
    description:
      'That page does not exist. Head back to Modulix Solutions for community growth, creator programmes and brand activations across the UGC space.',
  },
];

export const INDEXABLE_ROUTES = SITE_ROUTES.filter((route) => route.indexable);

/**
 * Looks up one route. Throws rather than returning undefined: a page asking
 * for a path that is not in the manifest is a page with no sitemap entry and
 * no canonical URL, which is worth failing the build over.
 */
export function getRoute(path: string): SiteRoute {
  const route = SITE_ROUTES.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`No route in the manifest for "${path}"`);
  return route;
}

/**
 * The metadata input for one route. Utility pages are the ones left out of the
 * sitemap, so indexability is declared once and the robots directive follows
 * from it instead of being repeated per page and eventually contradicting it.
 */
export function routeMeta(path: string): PageMetaInput {
  const route = getRoute(path);

  return {
    title: route.title,
    description: route.description,
    path: route.path,
    robots: route.indexable ? 'index, follow' : 'noindex, follow',
  };
}

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
