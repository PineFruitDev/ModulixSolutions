/**
 * Single source of truth for the values every page's metadata is built from.
 * Canonical URLs, social cards, JSON-LD and the sitemap all read from here, so
 * they cannot end up disagreeing with each other.
 */

export const SITE_URL = 'https://modulixsolutions.com';
export const SITE_NAME = 'Modulix Solutions';
export const SITE_LOCALE = 'en_US';

/** twitter:site and twitter:creator: the company posts from one account. */
export const X_HANDLE = '@ModulixSolution';

/**
 * The shared social card. 1200x630 is the size both Facebook and X crop to,
 * and the dimensions are declared so a crawler can reserve the space before it
 * has fetched the image. A unit test checks the file still matches these.
 */
export const OG_IMAGE = {
  path: '/og-image.jpg',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
  alt: 'Modulix Solutions',
} as const;

/**
 * Joins a site-relative path onto the canonical origin. Paths carry their own
 * trailing slash because next.config.js exports with trailingSlash: true, and
 * a canonical URL that redirects is a canonical URL search engines discard.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
