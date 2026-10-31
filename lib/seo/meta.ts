import { OG_IMAGE, SITE_LOCALE, SITE_NAME, X_HANDLE, absoluteUrl } from './site';

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface PageMetaInput {
  /** Document title. Reused verbatim as og:title and twitter:title. */
  title: string;
  description: string;
  /** This page's exported path, for example '/' or '/contact-confirmed/'. */
  path: string;
  /** Indexable by default; utility pages pass 'noindex, follow'. */
  robots?: string;
  /** og:type. Every page on this site is a plain page. */
  type?: string;
}

export interface PageMeta {
  title: string;
  canonical: string;
  tags: MetaTag[];
}

/**
 * Builds the complete tag set for one page.
 *
 * Pure on purpose: next/head renders nothing under jsdom, so computing the tags
 * separately from rendering them is what makes the metadata testable at all.
 */
export function buildPageMeta({
  title,
  description,
  path,
  robots = 'index, follow',
  type = 'website',
}: PageMetaInput): PageMeta {
  const canonical = absoluteUrl(path);
  const image = absoluteUrl(OG_IMAGE.path);

  return {
    title,
    canonical,
    tags: [
      { name: 'description', content: description },
      { name: 'robots', content: robots },

      { property: 'og:type', content: type },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: SITE_LOCALE },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: image },
      { property: 'og:image:type', content: OG_IMAGE.type },
      { property: 'og:image:width', content: String(OG_IMAGE.width) },
      { property: 'og:image:height', content: String(OG_IMAGE.height) },
      { property: 'og:image:alt', content: OG_IMAGE.alt },

      // No twitter:url: X falls back to og:url, and a second copy is a second
      // thing to forget to update.
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: X_HANDLE },
      { name: 'twitter:creator', content: X_HANDLE },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: OG_IMAGE.alt },
    ],
  };
}
