import fs from 'fs';
import path from 'path';

import React from 'react';
import { render } from '@testing-library/react';

import Home from '../../pages/index';

/**
 * Guards for the front-end weight decisions, at the level a unit test can
 * actually hold them.
 *
 * `npm run perf` measures the built output and is the thing to read for a
 * before/after. What it cannot do is run in CI on every commit without a full
 * build, and the two regressions that matter here are both visible in the
 * source: an `<img>` that forgets `loading`/`width`/`height`, and an
 * `import { motion }` that quietly re-registers the framer-motion features
 * `_app` exists to exclude. Both are cheap to assert and expensive to notice
 * any other way.
 */

const sourceFiles = (dir: string): string[] =>
  fs
    .readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? sourceFiles(path.join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [path.join(dir, entry.name)]
          : []
    );

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

/**
 * Intrinsic size of a lossless WebP, straight out of the VP8L header: a 0x2f
 * signature byte at offset 20, then width-1 and height-1 as 14-bit fields.
 * Throws on any other variant rather than guessing, so a mark re-encoded as
 * lossy VP8 or extended VP8X fails loudly instead of reporting 1x1.
 */
function webpSize(buffer: Buffer): { width: number; height: number } {
  const format = buffer.toString('ascii', 12, 16);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || format !== 'VP8L' || buffer[20] !== 0x2f) {
    throw new Error(`expected a lossless VP8L WebP, got ${format}`);
  }
  const bits = buffer.readUInt32LE(21);
  return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
}

describe('framer-motion stays on the minimal feature set', () => {
  // `motion` is a proxy that registers every feature eagerly, including the
  // layout projection engine, which is the single largest part of the library
  // and which nothing here uses. `m` plus an explicit feature set in _app is
  // what lets webpack drop it; one `import { motion }` anywhere undoes that
  // for the whole bundle, silently and without any test failing.
  test('no component imports the eager `motion` proxy', () => {
    const offenders = [...sourceFiles('components'), ...sourceFiles('pages')].filter(file =>
      /import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*'framer-motion'/.test(read(file))
    );
    expect(offenders).toEqual([]);
  });

  test('_app registers domAnimation, not domMax', () => {
    const app = read('pages/_app.tsx');
    expect(app).toContain('features={domAnimation}');
    // domMax adds drag and layout. Nothing sets drag, layout or layoutId, so
    // reaching for it would pay for the projection engine all over again.
    expect(app).not.toContain('domMax');
  });

  test('_app still has a LazyMotion wrapper at all', () => {
    // Only that it is present. Whether it actually encloses the page (rather
    // than, say, just <Head>) is not something reading the source proves, and
    // a provider around the wrong subtree leaves the page blank without
    // throwing. tests/smoke/motion-features.spec.ts is what covers that.
    expect(read('pages/_app.tsx')).toContain('<LazyMotion');
  });
});

describe('fonts', () => {
  // Google serves Inter as one variable font per subset. Listing weights does
  // not fetch more files; it repeats the same @font-face block once per weight
  // in the render-blocking stylesheet.
  test('Inter is loaded as a variable font, with no weight list', () => {
    const app = read('pages/_app.tsx');
    const inter = app.slice(app.indexOf('Inter({'), app.indexOf('const lato'));
    expect(inter).not.toMatch(/weight:/);
    expect(inter).toContain("display: 'swap'");
  });

  test('Lato keeps an explicit weight, having no variable version', () => {
    const app = read('pages/_app.tsx');
    expect(app.slice(app.indexOf('Lato({'))).toMatch(/weight: '700'/);
  });
});

describe('images', () => {
  const images = () => {
    const { container } = render(<Home />);
    return Array.from(container.querySelectorAll('img'));
  };

  test('the homepage renders some', () => {
    expect(images().length).toBeGreaterThan(0);
  });

  test('all of them are sized, so a decode cannot shift the layout', () => {
    images().forEach(image => {
      expect(image.getAttribute('width')).toMatch(/^\d+$/);
      expect(image.getAttribute('height')).toMatch(/^\d+$/);
    });
  });

  test('the client marks are deferred and off the critical path', () => {
    const marks = images().filter(image => image.getAttribute('src')?.startsWith('/companies/'));
    expect(marks.length).toBeGreaterThan(0);
    marks.forEach(mark => {
      expect(mark).toHaveAttribute('loading', 'lazy');
      expect(mark).toHaveAttribute('decoding', 'async');
      // WebP, not PNG: the PNGs were interlaced and three times the size.
      expect(mark.getAttribute('src')).toMatch(/\.webp$/);
    });
  });

  test('the header wordmark is eager and the footer copy is lazy', () => {
    // loading="lazy" on an in-viewport image delays it behind the lazy-load
    // pass, which pushes the first paint out rather than bringing it in. The
    // same file appears in the footer, where lazy is right, so the two are
    // asserted by landmark rather than by src.
    const { container } = render(<Home />);
    const inHeader = container.querySelectorAll('header img');
    const inFooter = container.querySelectorAll('footer img');

    expect(inHeader.length).toBeGreaterThan(0);
    inHeader.forEach(image => expect(image).not.toHaveAttribute('loading'));

    expect(inFooter.length).toBeGreaterThan(0);
    inFooter.forEach(image => expect(image).toHaveAttribute('loading', 'lazy'));
  });

  test('no mark is bigger in pixels or bytes than its 220px box needs', () => {
    // The carousel draws each mark in a 220px square, so 440px covers a 2x
    // display and anything past that is pixels the browser decodes and throws
    // away. Both limits are needed: a flat two-colour logo at 2000x2000
    // compresses to a few kB, so a byte budget alone would wave it through,
    // and a photographic 256px mark can be large in bytes while correctly
    // sized. 40 kB is roughly double the heaviest mark today.
    const dir = path.join(process.cwd(), 'public/companies');
    const offenders = fs
      .readdirSync(dir)
      .filter(file => file.endsWith('.webp'))
      .map(file => {
        const bytes = fs.readFileSync(path.join(dir, file));
        const { width, height } = webpSize(bytes);
        return { file, bytes: bytes.length, width, height };
      })
      .filter(mark => mark.bytes > 40 * 1024 || mark.width > 440 || mark.height > 440);
    expect(offenders).toEqual([]);
  });
});
