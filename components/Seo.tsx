import React from 'react';
import Head from 'next/head';

import { buildPageMeta } from '../lib/seo/meta';
import { routeMeta } from '../lib/seo/routes';

interface SeoProps {
  /**
   * This page's exported path, for example '/' or '/contact-confirmed/'. The
   * title, description and robots directive are read from the route manifest,
   * so a page cannot ship a title the sitemap and the manifest disagree with.
   */
  path: string;
  /**
   * Serialized JSON-LD for this page, if it publishes any. Callers build this
   * from static page copy at module scope; nothing here accepts visitor input,
   * which is what makes writing it into a script tag safe.
   */
  jsonLd?: string;
}

/**
 * Renders a page's whole metadata block.
 *
 * Every page goes through this, which is what stops a title, its og:title and
 * its twitter:title from drifting apart, and stops a new page shipping without
 * a canonical URL or a complete social card.
 */
export default function Seo({ path, jsonLd }: SeoProps) {
  const { title, canonical, tags } = buildPageMeta(routeMeta(path));

  return (
    <Head>
      <title>{title}</title>
      <link rel="canonical" href={canonical} />
      {/* These need React keys because they are an array, and next/head skips
          its own name-based de-duplication for any keyed meta. So a meta name
          emitted here must not also be declared in _app.tsx, or the page ships
          both copies. A unit test holds those two sets apart. */}
      {tags.map((tag) => (
        <meta key={tag.name ?? tag.property} {...tag} />
      ))}
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
    </Head>
  );
}
