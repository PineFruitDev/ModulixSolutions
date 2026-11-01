import { LOGO, OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from './site';

/**
 * JSON-LD the site publishes.
 *
 * This lives next to the rest of the metadata rather than inside the page so
 * the graph can be built from inputs and asserted against: a unit test walks
 * it and fails on a reference to an `@id` no node declares, which is the
 * failure mode that produces no error anywhere and simply drops the
 * relationship on the floor.
 */
export interface JsonLdNode {
  '@type': string | string[];
  '@id'?: string;
  [key: string]: unknown;
}

export interface JsonLdGraph {
  '@context': string;
  '@graph': JsonLdNode[];
}

// Node ids are referenced from several places in the graph, so they are named
// once rather than spelled out as string literals at each use. Exported
// because the tests assert on the relationships between them.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const WEBPAGE_ID = `${SITE_URL}/#webpage`;
export const FAQ_ID = `${SITE_URL}/#faq`;
export const FOUNDER_ID = `${SITE_URL}/#founder`;

export interface ServiceGroup {
  readonly name: string;
  readonly description: string;
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export interface HomeStructuredDataInput {
  /** The page title, which the WebPage node reports as its name. */
  title: string;
  description: string;
  /** Services as the page describes them, published as the offer catalog. */
  services: readonly ServiceGroup[];
  /** Questions as the page renders them, published as the FAQPage. */
  faqs: readonly FaqEntry[];
}

/**
 * Subjects the organization is asserted to work on. These describe the
 * category first and the platforms second, matching the page title and
 * llms.txt, so an answer engine reading the graph gets the same positioning
 * as one reading the prose.
 */
const KNOWS_ABOUT = [
  'User-generated content',
  'Creator economy infrastructure',
  'Online community management',
  'Brand activations',
  'Discord community infrastructure',
  'Fortnite UEFN',
  'Roblox',
];

/** Builds the homepage's whole JSON-LD graph. */
export function buildHomeStructuredData({
  title,
  description,
  services,
  faqs,
}: HomeStructuredDataInput): JsonLdGraph {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'Modulix',
        legalName: 'Modulix Solutions, LLC',
        alternateName: ['Modulix Solutions', 'Modulix GG'],
        url: absoluteUrl('/'),
        // An ImageObject rather than a bare URL: Google's logo guidance asks
        // for dimensions, and a string gives it nowhere to put them.
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(LOGO.path),
          width: LOGO.width,
          height: LOGO.height,
        },
        image: absoluteUrl(OG_IMAGE.path),
        // Ordered so the category leads and the platforms read as the examples
        // they are: the same positioning as the page title and llms.txt.
        description:
          'Modulix Solutions, LLC builds community, creator and brand-activation infrastructure for the user-generated content space, alongside deployed AI and agent systems and the owned UGC Suite of creator tools. Platform work includes Discord, Fortnite UEFN and Roblox.',
        knowsAbout: KNOWS_ABOUT,
        founder: { '@id': FOUNDER_ID },
        sameAs: [
          'https://modulix.gg',
          'https://discord.gg/modulix',
          'https://x.com/ModulixSolution',
          'https://www.linkedin.com/company/modulixsolution',
        ],
        owns: [
          {
            '@type': 'SoftwareApplication',
            name: 'VerifyUGC',
            url: 'https://verifyugc.dev',
          },
          {
            '@type': 'WebApplication',
            name: 'UGC Market',
            url: 'https://ugcmarket.dev',
          },
          {
            '@type': 'SoftwareApplication',
            name: 'UGCAdaptr',
            url: 'https://ugcadaptr.com',
          },
          {
            '@type': 'SoftwareApplication',
            name: 'UGCPouch',
            url: 'https://ugcpouch.com',
          },
        ],
        // The contact section is a form rather than a published address or
        // phone number, so the enquiry URL is the only contact detail
        // asserted here.
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'sales',
          url: `${SITE_URL}/#contact`,
          availableLanguage: 'en',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Modulix service ecosystem',
          itemListElement: services.map((group) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: group.name,
              description: group.description,
              provider: { '@id': ORGANIZATION_ID },
            },
          })),
        },
      },
      // The founder is named in llms-full.txt already; as a node the graph can
      // reference, it connects the company to an identity answer engines can
      // resolve rather than leaving it an unattributed brand.
      {
        '@type': 'Person',
        '@id': FOUNDER_ID,
        name: 'Sky Tomlinson',
        alternateName: 'PineFruitDev',
        url: 'https://pinefruit.dev/',
        sameAs: ['https://pinefruit.dev/'],
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: SITE_NAME,
        url: absoluteUrl('/'),
        inLanguage: 'en',
        publisher: { '@id': ORGANIZATION_ID },
      },
      // The page itself. Without this node the graph described the company and
      // the site but never the document a crawler was actually reading, so the
      // FAQ answers below had no page to hang off.
      {
        '@type': 'WebPage',
        '@id': WEBPAGE_ID,
        url: absoluteUrl('/'),
        name: title,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORGANIZATION_ID },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: absoluteUrl(OG_IMAGE.path),
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
        },
        // Points at the FAQ from the page as well as back from it, so the
        // relationship does not depend on a crawler following isPartOf in the
        // one direction.
        ...(faqs.length > 0 ? { mainEntity: { '@id': FAQ_ID } } : {}),
      },
      // A FAQPage with an empty mainEntity is invalid structured data, so the
      // node is dropped rather than published empty.
      ...(faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': FAQ_ID,
              isPartOf: { '@id': WEBPAGE_ID },
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };
}

/**
 * Serializes a graph for a <script type="application/ld+json"> body.
 *
 * The characters escaped here are the ones that change how the browser parses
 * the surrounding element rather than the JSON: a literal "</script>" inside
 * any string would end the script early and spill the rest into the document.
 * Nothing in this graph comes from a visitor today, so this is a guard against
 * a future string (an FAQ answer, a service description) containing markup,
 * not a fix for a live hole. They are ordinary JSON escapes, so a parser reads
 * the original characters back.
 */
export function serializeJsonLd(graph: JsonLdGraph): string {
  const escapes: Record<string, string> = {
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  };

  return JSON.stringify(graph).replace(/[<>&\u2028\u2029]/g, (char) => escapes[char]);
}
