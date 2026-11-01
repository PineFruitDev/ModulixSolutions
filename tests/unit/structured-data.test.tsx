import fs from 'fs';
import path from 'path';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';

import Home, { homeStructuredData } from '../../pages/index';
import {
  FAQ_ID,
  FOUNDER_ID,
  ORGANIZATION_ID,
  WEBPAGE_ID,
  WEBSITE_ID,
  buildHomeStructuredData,
  serializeJsonLd,
  type JsonLdNode,
} from '../../lib/seo/structuredData';
import { getRoute } from '../../lib/seo/routes';
import { LOGO, OG_IMAGE, absoluteUrl } from '../../lib/seo/site';

const graph = homeStructuredData['@graph'];

const nodeOfType = (type: string) =>
  graph.find((node) => node['@type'] === type) as JsonLdNode | undefined;

/**
 * Every object anywhere in the graph, flattened, so the checks below do not
 * each have to recurse. Written as a plain accumulator rather than a generator
 * because the TypeScript target in tsconfig.json predates iterating one.
 */
function walk(value: unknown, into: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, into));
    return into;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    into.push(record);
    Object.values(record).forEach((nested) => walk(nested, into));
  }
  return into;
}

beforeEach(() => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  Element.prototype.scrollIntoView = jest.fn();
});

afterEach(cleanup);

describe('the JSON-LD graph is internally consistent', () => {
  test('every node declares a type and a unique id', () => {
    for (const node of graph) {
      expect(node['@type']).toBeTruthy();
      expect(node['@id']).toBeTruthy();
    }

    const ids = graph.map((node) => node['@id']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every @id reference resolves to a node the graph declares', () => {
    // The failure this catches is silent: a reference to an id nothing defines
    // is valid JSON and valid schema.org, and simply drops the relationship.
    // It is what happens when a node is renamed or removed.
    const declared = new Set(graph.map((node) => node['@id']));

    const references = walk(homeStructuredData)
      // A reference is an object whose only key is @id. A node that declares
      // an @id alongside its other properties is a definition, not a
      // reference, so it is not checked against itself.
      .filter((record) => Object.keys(record).length === 1 && typeof record['@id'] === 'string')
      .map((record) => record['@id'] as string);

    // Guard the guard: if the filter ever stops matching, the loop below
    // passes by checking nothing.
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(declared).toContain(reference);
    }
  });

  test('the published ids are exactly these, spelled out', () => {
    // Deliberately hard-coded rather than compared against the exported
    // constants, which would be comparing the graph against itself and would
    // pass through a rename. These strings are the site's entity identifiers:
    // external references and Google's entity reconciliation have accumulated
    // against them, so changing one retires an identity rather than editing a
    // value, and that should take a visible test change to do.
    expect(graph.map((node) => node['@id']).sort()).toEqual([
      'https://modulixsolutions.com/#faq',
      'https://modulixsolutions.com/#founder',
      'https://modulixsolutions.com/#organization',
      'https://modulixsolutions.com/#webpage',
      'https://modulixsolutions.com/#website',
    ]);
  });

  test('the exported id constants match the ids the graph ships', () => {
    // The constants are what the rest of the code references, so they have to
    // agree with the literals above; this is the link between the two.
    expect([ORGANIZATION_ID, FOUNDER_ID, WEBSITE_ID, WEBPAGE_ID, FAQ_ID].sort()).toEqual(
      graph.map((node) => node['@id']).sort()
    );
  });

  test('every URL in the graph is absolute and https', () => {
    const urls = walk(homeStructuredData).flatMap((record) =>
      Object.entries(record)
        .filter(([key]) => key === 'url' || key === 'sameAs' || key === '@id')
        .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === 'string')
    );

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      // A relative URL in JSON-LD resolves against the document base, which
      // differs between the exported page and anything that mirrors it.
      expect(url).toMatch(/^https:\/\//);
    }
  });
});

describe('the graph describes the page that is actually rendered', () => {
  test('the WebPage node reports the title and description from the manifest', () => {
    const home = getRoute('/');
    const webPage = nodeOfType('WebPage');

    expect(webPage?.name).toBe(home.title);
    expect(webPage?.description).toBe(home.description);
    expect(webPage?.url).toBe(absoluteUrl('/'));
  });

  test('every FAQ answer in the graph is visible on the page', () => {
    // Google requires the answer text to be present on the page, so a FAQ
    // node the page no longer renders is a structured-data violation, not
    // just stale copy.
    render(<Home />);

    const questions = (nodeOfType('FAQPage')?.mainEntity as JsonLdNode[]) ?? [];
    expect(questions.length).toBeGreaterThan(0);

    for (const question of questions) {
      expect(screen.getByText(question.name as string)).toBeInTheDocument();
      const answer = question.acceptedAnswer as JsonLdNode;
      expect(screen.getByText(answer.text as string)).toBeInTheDocument();
    }
  });

  test('every service in the offer catalog is described on the page', () => {
    render(<Home />);

    const organization = nodeOfType('Organization');
    const catalog = organization?.hasOfferCatalog as JsonLdNode;
    const offers = catalog.itemListElement as JsonLdNode[];
    expect(offers.length).toBeGreaterThan(0);

    for (const offer of offers) {
      const service = offer.itemOffered as JsonLdNode;
      expect(screen.getByText(service.name as string)).toBeInTheDocument();
      expect(screen.getByText(service.description as string)).toBeInTheDocument();
    }
  });

  test('the FAQ node is dropped entirely when there are no questions', () => {
    // An empty mainEntity is invalid structured data, so the node has to be
    // absent rather than present and empty, and the WebPage must not point at
    // a node that is no longer there.
    const empty = buildHomeStructuredData({
      title: 't',
      description: 'd',
      services: [],
      faqs: [],
    });

    expect(empty['@graph'].some((node) => node['@type'] === 'FAQPage')).toBe(false);
    expect(
      empty['@graph'].find((node) => node['@type'] === 'WebPage')?.mainEntity
    ).toBeUndefined();
  });
});

/**
 * Reads the dimensions out of a PNG's IHDR chunk, which is always the first
 * chunk and always at a fixed offset.
 */
function readPngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('the images the graph promises exist at the size it claims', () => {
  test('the logo ImageObject matches the file on disk', () => {
    const organization = nodeOfType('Organization');
    const logo = organization?.logo as JsonLdNode;

    expect(logo['@type']).toBe('ImageObject');
    expect(logo.url).toBe(absoluteUrl(LOGO.path));

    const file = path.join(process.cwd(), 'public', LOGO.path);
    expect(fs.existsSync(file)).toBe(true);
    expect(readPngSize(fs.readFileSync(file))).toEqual({
      width: LOGO.width,
      height: LOGO.height,
    });
  });

  test('the page image is the social card, so one file covers both', () => {
    const webPage = nodeOfType('WebPage');
    const image = webPage?.primaryImageOfPage as JsonLdNode;
    expect(image.url).toBe(absoluteUrl(OG_IMAGE.path));
    expect(image.width).toBe(OG_IMAGE.width);
  });
});

describe('serializing the graph cannot break out of the script element', () => {
  test('a string containing markup is escaped rather than closing the tag', () => {
    const serialized = serializeJsonLd(
      buildHomeStructuredData({
        title: 't',
        description: 'd',
        services: [{ name: '</script><img src=x>', description: 'd' }],
        faqs: [{ question: 'q & a', answer: '</script>' }],
      })
    );

    // The literal sequence is what ends a script element early; anything after
    // it would be parsed as markup in the document.
    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('>');
    expect(serialized).not.toContain('&');
  });

  test('the escaping is ordinary JSON, so a parser reads the original back', () => {
    const input = buildHomeStructuredData({
      title: 't',
      description: 'd',
      services: [],
      faqs: [{ question: '1 < 2 & 3 > 2', answer: '</script>' }],
    });

    expect(JSON.parse(serializeJsonLd(input))).toEqual(JSON.parse(JSON.stringify(input)));
  });

  test('the graph the page ships parses', () => {
    expect(() => JSON.parse(serializeJsonLd(homeStructuredData))).not.toThrow();
  });
});
