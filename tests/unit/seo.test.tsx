import fs from 'fs';
import path from 'path';

import { buildPageMeta, type MetaTag } from '../../lib/seo/meta';
import { SITE_ROUTES, buildSitemapXml, getRoute, routeMeta } from '../../lib/seo/routes';
import { OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from '../../lib/seo/site';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const find = (tags: MetaTag[], key: string) =>
  tags.find((tag) => tag.name === key || tag.property === key)?.content;

describe('page metadata', () => {
  const home = buildPageMeta({
    title: 'Home title',
    description: 'Home description',
    path: '/',
  });

  test('the canonical URL is absolute and keeps the exported trailing slash', () => {
    // trailingSlash: true means /contact-confirmed redirects to
    // /contact-confirmed/, and a canonical that redirects is discarded.
    expect(home.canonical).toBe('https://modulixsolutions.com/');
    expect(
      buildPageMeta({ title: 't', description: 'd', path: '/contact-confirmed/' }).canonical
    ).toBe('https://modulixsolutions.com/contact-confirmed/');
  });

  test('og:url matches the canonical URL rather than being omitted', () => {
    expect(find(home.tags, 'og:url')).toBe(home.canonical);
  });

  test('the title is not allowed to differ from the social card titles', () => {
    expect(find(home.tags, 'og:title')).toBe(home.title);
    expect(find(home.tags, 'twitter:title')).toBe(home.title);
    expect(find(home.tags, 'og:description')).toBe('Home description');
    expect(find(home.tags, 'twitter:description')).toBe('Home description');
    expect(find(home.tags, 'description')).toBe('Home description');
  });

  test('the card is a large summary with an absolute image, sized and attributed', () => {
    expect(find(home.tags, 'twitter:card')).toBe('summary_large_image');
    expect(find(home.tags, 'og:image')).toBe(`${SITE_URL}${OG_IMAGE.path}`);
    expect(find(home.tags, 'twitter:image')).toBe(`${SITE_URL}${OG_IMAGE.path}`);
    expect(find(home.tags, 'og:image:width')).toBe('1200');
    expect(find(home.tags, 'og:image:height')).toBe('630');
    expect(find(home.tags, 'og:image:type')).toBe('image/jpeg');
    expect(find(home.tags, 'twitter:site')).toBe('@ModulixSolution');
  });

  test('both card images carry alt text', () => {
    expect(find(home.tags, 'og:image:alt')).toBeTruthy();
    expect(find(home.tags, 'twitter:image:alt')).toBeTruthy();
  });

  test('pages are indexable unless they opt out', () => {
    expect(find(home.tags, 'robots')).toBe('index, follow');
    const utility = buildPageMeta({
      title: 't',
      description: 'd',
      path: '/500/',
      robots: 'noindex, follow',
    });
    expect(find(utility.tags, 'robots')).toBe('noindex, follow');
    // Still a complete card: a noindex page is still shared in chat.
    expect(find(utility.tags, 'og:url')).toBe('https://modulixsolutions.com/500/');
  });

  test('an absolute URL passed as a path is left alone', () => {
    expect(absoluteUrl('https://modulix.gg/')).toBe('https://modulix.gg/');
  });

  test('no tag is emitted twice, which would make the rendered keys collide', () => {
    const keys = home.tags.map((tag) => tag.name ?? tag.property);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * Walks the JPEG marker segments to the start-of-frame header and reads the
 * dimensions out of it.
 *
 * Scanning for the raw FF C0 bytes instead would break on two things a routine
 * re-export does by default: saving progressively changes the marker to SOF2,
 * and an embedded Exif thumbnail is a whole JPEG sitting before the real frame,
 * so its dimensions get read instead of the image's.
 */
function readJpegSize(bytes: Buffer): { width: number; height: number } {
  // Any SOF marker except the Huffman/arithmetic table and restart markers.
  const isStartOfFrame = (marker: number) =>
    marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

  let offset = 2; // Skip the FF D8 signature.
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error(`expected a marker at ${offset}`);

    const marker = bytes[offset + 1];
    if (isStartOfFrame(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }

    offset += 2 + bytes.readUInt16BE(offset + 2);
  }

  throw new Error('no start-of-frame marker found');
}

describe('the social card file matches what the tags promise', () => {
  test('og-image.jpg exists and really is the size the tags declare', () => {
    const file = path.join(process.cwd(), 'public', OG_IMAGE.path);
    expect(fs.existsSync(file)).toBe(true);
    expect(readJpegSize(fs.readFileSync(file))).toEqual({
      width: OG_IMAGE.width,
      height: OG_IMAGE.height,
    });
  });
});

/**
 * The manifest owns every page's title and description, so these run over all
 * of them at once. That is the point of keeping the strings there: a new page
 * is length-checked and uniqueness-checked the moment it is listed, with no
 * per-page test to remember to write.
 */
describe('every route ships a usable title and description', () => {
  // Google truncates the displayed title around 60 characters and the snippet
  // around 160. The lower bounds are not style rules: a two-word description
  // gets ignored in favour of scraped page text, which is worse than a
  // deliberate one.
  const TITLE_MAX = 60;
  const DESCRIPTION_MIN = 70;
  const DESCRIPTION_MAX = 158;

  test.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    '%s',
    (_path, route) => {
      expect(route.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(route.description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(route.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);

      // The brand belongs in the title: these are the words a searcher scans
      // for, and the status pages are reachable directly from a shared link.
      expect(route.title).toContain(SITE_NAME);

      // Leading, trailing or doubled whitespace survives into the rendered tag
      // and into the social card, where it is visible.
      for (const text of [route.title, route.description]) {
        expect(text).toBe(text.trim());
        expect(text).not.toMatch(/\s{2,}/);
      }

      // A description that is really a sentence fragment reads as truncated in
      // a result snippet.
      expect(route.description).toMatch(/[.!?]$/);
    }
  );

  test('no two pages share a title or a description', () => {
    // Duplicate metadata across URLs is the specific thing Search Console
    // reports, and it makes the pages compete for the same query.
    const titles = SITE_ROUTES.map((route) => route.title);
    const descriptions = SITE_ROUTES.map((route) => route.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  test('the robots directive follows from indexability rather than being set twice', () => {
    for (const route of SITE_ROUTES) {
      expect(routeMeta(route.path).robots).toBe(
        route.indexable ? 'index, follow' : 'noindex, follow'
      );
    }
  });

  test('asking for a path that is not in the manifest fails loudly', () => {
    // A page passing an unlisted path would otherwise render an empty title and
    // a canonical URL pointing at the origin.
    expect(() => getRoute('/not-a-page/')).toThrow(/manifest/);
  });
});

describe('sitemap and robots', () => {
  test('the committed sitemap is exactly what the route manifest generates', () => {
    // .gitattributes sets text=auto, so a CRLF checkout would otherwise fail
    // this on the line endings rather than on the content.
    expect(read('public/sitemap.xml').replace(/\r\n/g, '\n')).toBe(buildSitemapXml());
  });

  test('only indexable routes are listed', () => {
    const sitemap = read('public/sitemap.xml');
    for (const route of SITE_ROUTES) {
      // Matched as a whole loc element: every URL here starts with the origin,
      // so a bare substring check would report the root as present always.
      const loc = `<loc>${absoluteUrl(route.path)}</loc>`;
      if (route.indexable) {
        expect(sitemap).toContain(loc);
      } else {
        expect(sitemap).not.toContain(loc);
      }
    }
  });

  test('route paths use the trailing slash the export actually serves', () => {
    for (const route of SITE_ROUTES) {
      // trailingSlash: true means /contact-confirmed redirects to
      // /contact-confirmed/. A canonical or a sitemap entry that redirects is
      // one search engines discard, so the manifest has to carry the slash.
      expect(route.path === '/' || route.path.endsWith('/') || route.path.endsWith('.html')).toBe(
        true
      );
    }
  });

  test('the manifest and the pages directory describe the same set of pages', () => {
    // Checked both ways round. Route with no page is a soft 404 in the sitemap;
    // page with no route silently ships with no sitemap entry, and is the
    // likelier mistake because nothing else complains about it.
    const pageRoutes = fs
      .readdirSync(path.join(process.cwd(), 'pages'), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.tsx') && !path.basename(file).startsWith('_'))
      .map((file) => {
        const slug = file.replace(/\.tsx$/, '');
        if (slug === 'index') return '/';
        // 404 is the one page GitHub Pages serves flat for a missing route.
        return slug === '404' ? '/404.html' : `/${slug.replace(/\/index$/, '')}/`;
      });

    expect([...SITE_ROUTES].map((route) => route.path).sort()).toEqual(pageRoutes.sort());
  });

  test('robots.txt points at the sitemap on the canonical origin', () => {
    expect(read('public/robots.txt')).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe('the site-wide head and the per-page head do not overlap', () => {
  test('_app declares no meta name that Seo also emits', () => {
    // next/head skips name-based de-duplication for keyed metas, and Seo's are
    // keyed because they are rendered from an array. A name declared in both
    // places would therefore ship twice, with _app's copy winning.
    const app = read('pages/_app.tsx');
    const appMetaNames = Array.from(app.matchAll(/<meta\s+name="([^"]+)"/g), (match) => match[1]);
    expect(appMetaNames.length).toBeGreaterThan(0);

    const seoNames = buildPageMeta({ title: 't', description: 'd', path: '/' }).tags
      .map((tag) => tag.name)
      .filter(Boolean);

    expect(appMetaNames.filter((name) => seoNames.includes(name))).toEqual([]);
  });
});
