import fs from 'fs';
import path from 'path';
import React from 'react';
import { cleanup, render } from '@testing-library/react';

import Home, { homeStructuredData } from '../../pages/index';
import { SITE_ROUTES } from '../../lib/seo/routes';
import { SITE_URL, X_HANDLE } from '../../lib/seo/site';

/**
 * robots.txt, llms.txt and llms-full.txt are hand-maintained text files that
 * tell crawlers and answer engines what this company is and where to find it.
 * Nothing imports them, so nothing noticed when they drifted: llms-full.txt
 * was citing a different X handle on the legacy twitter.com domain than every
 * other reference on the site, which would have an answer engine citing the
 * wrong profile.
 */
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'public', file), 'utf8');

const AEO_FILES = ['llms.txt', 'llms-full.txt'] as const;

const organization = homeStructuredData['@graph'].find(
  (node) => node['@type'] === 'Organization'
);
const sameAs = organization?.sameAs as string[];

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

describe('the answer-engine files exist and use the canonical origin', () => {
  test.each(AEO_FILES)('%s is present and not empty', (file) => {
    expect(read(file).trim().length).toBeGreaterThan(0);
  });

  test.each(AEO_FILES)('%s names this site only at its canonical origin', (file) => {
    const contents = read(file);

    // A citation pointing at http:// or the www host is a citation pointing at
    // a redirect, and these files exist precisely to be cited.
    expect(contents).not.toMatch(/http:\/\/modulixsolutions\.com/);
    expect(contents).not.toMatch(/https:\/\/www\.modulixsolutions\.com/);
    expect(contents).toContain(SITE_URL);
  });

  test('llms.txt points at the expanded file, which is the one it promises', () => {
    expect(read('llms.txt')).toContain(`${SITE_URL}/llms-full.txt`);
  });
});

describe('the files agree with the structured data about where to find us', () => {
  // The site states its social profiles in three places: the Organization
  // sameAs, the twitter:site meta tag, and these files. Two of them
  // disagreeing is how a wrong profile gets cited.
  const handle = X_HANDLE.replace(/^@/, '');

  test.each(AEO_FILES)('%s cites the same X profile as the meta tags', (file) => {
    const contents = read(file);
    expect(contents).toContain(`https://x.com/${handle}`);
    // twitter.com still resolves, but it is not what the rest of the site
    // says, and a stale handle hides behind the redirect.
    expect(contents).not.toMatch(/twitter\.com/);
  });

  test.each(AEO_FILES)('%s cites the same profiles the graph claims', (file) => {
    const contents = read(file);
    for (const profile of sameAs) {
      expect(contents).toContain(profile);
    }
  });

  test('llms-full.txt cites the founder URL the graph publishes', () => {
    const founder = homeStructuredData['@graph'].find((node) => node['@type'] === 'Person');
    expect(read('llms-full.txt')).toContain(founder?.url as string);
  });
});

describe('every link in llms.txt goes somewhere that exists', () => {
  const links = Array.from(
    read('llms.txt').matchAll(/https:\/\/modulixsolutions\.com(\/[^\s)]*)?/g),
    // Trailing sentence punctuation is not part of the URL.
    (match) => (match[1] ?? '/').replace(/[.,]$/, '')
  );

  test('the links were actually found, so the checks below are not vacuous', () => {
    expect(links.length).toBeGreaterThan(0);
  });

  test('every on-page anchor is a section the homepage renders', () => {
    // A dead anchor sends a visitor arriving from an AI answer to the top of
    // the page with no explanation.
    render(<Home />);

    const anchors = links.filter((link) => link.startsWith('/#')).map((link) => link.slice(2));
    expect(anchors.length).toBeGreaterThan(0);

    for (const anchor of anchors) {
      expect(document.querySelector(`#${anchor}`)).toBeInTheDocument();
    }
  });

  test('every other link is a route in the manifest or a file in public/', () => {
    const routes = new Set(SITE_ROUTES.map((route) => route.path));

    for (const link of links.filter((candidate) => !candidate.startsWith('/#'))) {
      const isRoute = routes.has(link);
      const isFile = fs.existsSync(path.join(process.cwd(), 'public', link));
      if (!isRoute && !isFile) {
        throw new Error(`llms.txt links to ${link}, which is neither a route nor a file`);
      }
    }
  });
});

describe('robots.txt', () => {
  const robots = read('robots.txt');

  test('nothing on the site is disallowed, since noindex is what gates pages here', () => {
    // Utility pages are kept out of search with a robots meta tag, which a
    // crawler can only read if it is allowed to fetch the page. A Disallow
    // rule would hide the noindex and the pages could still be indexed from
    // external links.
    const disallowed = Array.from(robots.matchAll(/^Disallow:\s*(\S+)/gim), (match) => match[1]);
    expect(disallowed).toEqual([]);
  });

  test('the sitemap is declared once, absolutely, on the canonical origin', () => {
    const sitemaps = Array.from(robots.matchAll(/^Sitemap:\s*(\S+)/gim), (match) => match[1]);
    expect(sitemaps).toEqual([`${SITE_URL}/sitemap.xml`]);
  });

  test('the answer-engine files are crawlable', () => {
    // They are useless if a crawler is told not to fetch them.
    for (const file of AEO_FILES) {
      expect(robots).not.toContain(`Disallow: /${file}`);
    }
  });
});
