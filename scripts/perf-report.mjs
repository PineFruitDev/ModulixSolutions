#!/usr/bin/env node
/**
 * Front-end weight report for the exported site.
 *
 * Reads `.next/` and `out/` after a build and prints the numbers that actually
 * decide how fast the first paint is: how much JavaScript a route has to parse
 * before it is interactive, how much render-blocking CSS sits in front of that,
 * how many font bytes are preloaded, and how heavy the images a page requests
 * are. Every number comes from a file on disk, so two runs of the same commit
 * agree, and a before/after pair is a diff of this output rather than a
 * Lighthouse score that moves on its own.
 *
 * Deliberately not a Lighthouse run: Lighthouse scores vary by several points
 * between runs on the same bytes, which makes them useless as a regression
 * gate. These are the inputs Lighthouse measures, counted exactly.
 *
 * Reports only. Always exits 0, and nothing in CI runs it, so this is a thing
 * to read rather than a gate. Source-level guards that do fail a build live in
 * `tests/unit/perf-budget.test.tsx`.
 *
 * Usage: npm run build && npm run perf
 *        npm run perf -- --json     (machine-readable)
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const NEXT_DIR = join(ROOT, '.next');
const OUT_DIR = join(ROOT, 'out');

/** Gzip is what the wire actually carries, so it is the number that is ranked. */
function sizes(absPath) {
  const raw = readFileSync(absPath);
  return { raw: raw.length, gzip: gzipSync(raw, { level: 9 }).length };
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function sum(files, field) {
  return files.reduce((total, file) => total + file[field], 0);
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

/**
 * First Load JS: every chunk the browser must fetch and run before a route
 * hydrates. Per route that is `build-manifest.json`'s `pages/_app` entry
 * unioned with the route's own, deduplicated, which is the same set
 * `next build` prints. Recomputing it here rather than scraping the build log
 * keeps the report runnable against an existing `.next/` without a rebuild.
 *
 * The summary row is the intersection across routes, which is not the same as
 * `/_app`'s list; see the comment on `common` below.
 */
function firstLoadByRoute() {
  const manifestPath = join(NEXT_DIR, 'build-manifest.json');
  if (!existsSync(manifestPath)) return null;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const pages = manifest.pages ?? {};
  // The manifest lists the route's stylesheet alongside its chunks, and the
  // polyfill bundle is `nomodule` so no current browser fetches it. Neither
  // belongs in a JavaScript total; the CSS is reported on its own below.
  const isJs = (chunk) => chunk.endsWith('.js');
  // `/_app` ships with every route; `/_error` is not a navigable page here.
  const appChunks = new Set((pages['/_app'] ?? []).filter(isJs));

  const navigable = Object.keys(pages)
    .filter((route) => route !== '/_app' && route !== '/_error')
    .sort();

  const perRoute = navigable.map((route) => ({
    route,
    chunks: [...new Set([...appChunks, ...(pages[route] ?? []).filter(isJs)])],
  }));

  const measure = (chunks) => {
    const measured = chunks
      .map((chunk) => join(NEXT_DIR, chunk))
      .filter(existsSync)
      .map(sizes);
    return {
      chunks: chunks.length,
      raw: sum(measured, 'raw'),
      gzip: sum(measured, 'gzip'),
    };
  };

  // The real intersection, not just `/_app`'s list. Webpack can hoist a chunk
  // into every page without it appearing under `/_app` (the shared vendor
  // chunk does exactly that), and calling `/_app`'s set "shared by all" would
  // leave those bytes out of the row while still counting them per route.
  const common = perRoute.length
    ? perRoute
        .map((entry) => entry.chunks)
        .reduce((intersection, chunks) => intersection.filter((chunk) => chunks.includes(chunk)))
    : [];

  return {
    routes: perRoute.map((entry) => ({ route: entry.route, ...measure(entry.chunks) })),
    shared: measure(common),
  };
}

/**
 * Render-blocking stylesheets and preloaded fonts from the head, plus every
 * parser-blocking script in the document. Scripts are counted over the whole
 * file, not just the head: Next emits its bundles at the end of `<body>`, and
 * one of those without `defer` would block the parser exactly as a head script
 * would.
 *
 * A script is treated as parser-blocking unless it carries `defer`, `async` or
 * `type="module"` (all three of which the browser defers), or it is a
 * non-executable JSON payload such as `__NEXT_DATA__` or a JSON-LD block.
 */
function blockingByPage() {
  // Matched as attribute names rather than with \b, which would also fire on
  // the value: a chunk legitimately named `async-boundary.js` contains "async"
  // inside its src and would otherwise be scored as deferred.
  const hasAttribute = (attrs, name) =>
    new RegExp(`(^|\\s)${name}(\\s|=|$)`).test(attrs);

  return walk(OUT_DIR)
    .filter((file) => extname(file) === '.html')
    .sort()
    .map((file) => {
      const html = readFileSync(file, 'utf8');
      const headEnd = html.indexOf('</head>');
      const head = headEnd === -1 ? html : html.slice(0, headEnd);

      const stylesheets = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
        .map((match) => /href="([^"]+)"/.exec(match[0])?.[1])
        .filter(Boolean);

      const blockingScripts = [...html.matchAll(/<script\b([^>]*)>/g)]
        .map((match) => match[1])
        .filter(
          (attrs) =>
            !hasAttribute(attrs, 'defer') &&
            !hasAttribute(attrs, 'async') &&
            !/type="module"/.test(attrs),
        )
        .filter((attrs) => !/type="(application\/(ld\+)?json)"/.test(attrs))
        // A bare `<script>` with no src and no type is inline executable code.
        .filter((attrs) => hasAttribute(attrs, 'src') || !/type=/.test(attrs));

      const preloadedFonts = [...head.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)]
        .map((match) => match[0])
        .filter((tag) => /as="font"/.test(tag))
        .map((tag) => /href="([^"]+)"/.exec(tag)?.[1])
        .filter(Boolean);

      const cssBytes = stylesheets
        .map((href) => join(OUT_DIR, href.replace(/^\//, '')))
        .filter(existsSync)
        .map(sizes);

      const fontBytes = preloadedFonts
        .map((href) => join(OUT_DIR, href.replace(/^\//, '')))
        .filter(existsSync)
        .map(sizes);

      return {
        page: `/${relative(OUT_DIR, file)}`,
        stylesheets: stylesheets.length,
        cssRaw: sum(cssBytes, 'raw'),
        cssGzip: sum(cssBytes, 'gzip'),
        blockingScripts: blockingScripts.length,
        preloadedFonts: preloadedFonts.length,
        // Fonts are already woff2-compressed, so only the raw size is real.
        preloadedFontRaw: sum(fontBytes, 'raw'),
        // A `@font-face` the page can never use is still parsed before paint.
        fontFaceRules: stylesheets
          .map((href) => join(OUT_DIR, href.replace(/^\//, '')))
          .filter(existsSync)
          .reduce(
            (total, css) => total + (readFileSync(css, 'utf8').match(/@font-face/g) ?? []).length,
            0,
          ),
      };
    });
}

/**
 * Images the markup actually asks for, split by whether they are deferred.
 * An eager image competes with the first paint; a lazy one does not, so the
 * two totals are not interchangeable and are never added together.
 */
function imageWeight() {
  const htmlFiles = walk(OUT_DIR).filter((file) => extname(file) === '.html');
  const eager = new Map();
  const lazy = new Map();
  const unsized = [];

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = match[0];
      const src = /src="([^"]+)"/.exec(tag)?.[1];
      if (!src || !src.startsWith('/')) continue;

      const abs = join(OUT_DIR, src.replace(/^\//, ''));
      if (!existsSync(abs)) continue;

      (/loading="lazy"/.test(tag) ? lazy : eager).set(src, statSync(abs).size);

      // Without both dimensions the box has no aspect ratio until the bytes
      // land, which is a layout shift the moment the image decodes.
      if (!/\bwidth="/.test(tag) || !/\bheight="/.test(tag)) {
        unsized.push({ page: `/${relative(OUT_DIR, file)}`, src });
      }
    }
  }

  // The same file can be eager on one page and lazy on another, as the icon is
  // (eager in the header, lazy in the footer). Counting it in both totals
  // would overstate the deferred bytes by however much it weighs, so eager
  // wins: if any page fetches it up front, it is not deferred weight.
  for (const src of eager.keys()) lazy.delete(src);

  const total = (map) => [...map.values()].reduce((a, b) => a + b, 0);
  return {
    eagerCount: eager.size,
    eagerBytes: total(eager),
    lazyCount: lazy.size,
    lazyBytes: total(lazy),
    unsized,
  };
}

/**
 * Files published to the host that no built page references. They cost nothing
 * on first paint but are still uploaded on every deploy, and an unreferenced
 * megabyte is usually an asset someone forgot to delete.
 *
 * A hint, not a verdict. The search is textual, so it cannot see a path built
 * at runtime from fragments, and it only recognises root-relative references
 * (`/companies/x.webp`), which is the form this codebase uses everywhere. A
 * relative `url(companies/x.webp)` in CSS would be missed and the asset would
 * be listed here while being perfectly live. Confirm with a grep before
 * deleting anything on the strength of this list.
 */
function unreferencedAssets() {
  const referencingText = walk(OUT_DIR)
    .filter((file) => ['.html', '.css', '.js', '.json', '.xml', '.txt'].includes(extname(file)))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  // The reference has to be delimited, so `/logo.png` is not counted as
  // referenced merely because `/companies/logo.png` appears somewhere. The
  // character before it must not be another path character.
  const isReferenced = (assetPath) =>
    new RegExp(`(^|[^\\w./-])${assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(
      referencingText,
    );

  return walk(OUT_DIR)
    .filter((file) => ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'].includes(extname(file)))
    .map((file) => ({ path: `/${relative(OUT_DIR, file)}`, bytes: statSync(file).size }))
    .filter((asset) => !isReferenced(asset.path))
    .sort((a, b) => b.bytes - a.bytes);
}

function build() {
  return {
    firstLoad: firstLoadByRoute(),
    pages: blockingByPage(),
    images: imageWeight(),
    unreferenced: unreferencedAssets(),
    deployBytes: sum(
      walk(OUT_DIR).map((file) => ({ raw: statSync(file).size })),
      'raw',
    ),
  };
}

function report(data) {
  const lines = [];
  const row = (...cells) => lines.push(cells.join(''));
  const pad = (value, width) => String(value).padEnd(width);
  const padStart = (value, width) => String(value).padStart(width);

  row('First Load JS (every chunk a route runs before it hydrates)');
  if (!data.firstLoad) {
    row('  .next/build-manifest.json missing. Run `npm run build` first.');
  } else {
    row('  ', pad('route', 24), padStart('gzip', 12), padStart('raw', 12), padStart('chunks', 9));
    for (const route of data.firstLoad.routes) {
      row('  ', pad(route.route, 24), padStart(kb(route.gzip), 12), padStart(kb(route.raw), 12), padStart(route.chunks, 9));
    }
    const { shared } = data.firstLoad;
    row('  ', pad('(common to every route)', 24), padStart(kb(shared.gzip), 12), padStart(kb(shared.raw), 12), padStart(shared.chunks, 9));
  }

  row('');
  row('Render-blocking CSS and fonts in the head, and parser-blocking scripts anywhere');
  row('  ', pad('page', 30), padStart('css gzip', 11), padStart('blocking js', 13), padStart('font preload', 14), padStart('@font-face', 12));
  for (const page of data.pages) {
    row(
      '  ',
      pad(page.page, 30),
      padStart(kb(page.cssGzip), 11),
      padStart(page.blockingScripts, 13),
      padStart(`${page.preloadedFonts} / ${kb(page.preloadedFontRaw)}`, 14),
      padStart(page.fontFaceRules, 12),
    );
  }

  row('');
  row('Images requested by the markup');
  row('  eager (competes with first paint): ', `${data.images.eagerCount} files, ${kb(data.images.eagerBytes)}`);
  row('  lazy  (deferred until scrolled to): ', `${data.images.lazyCount} files, ${kb(data.images.lazyBytes)}`);
  row('  without width+height (shifts layout): ', String(data.images.unsized.length));
  for (const image of data.images.unsized) {
    row('    ', `${image.page} -> ${image.src}`);
  }

  row('');
  row('Published but unreferenced by any built page');
  if (data.unreferenced.length === 0) {
    row('  none');
  } else {
    for (const asset of data.unreferenced) {
      row('  ', pad(asset.path, 34), padStart(kb(asset.bytes), 11));
    }
    row('  ', pad('total', 34), padStart(kb(sum(data.unreferenced.map((a) => ({ raw: a.bytes })), 'raw')), 11));
  }

  row('');
  row(`Total exported payload: ${kb(data.deployBytes)}`);
  return lines.join('\n');
}

function main() {
  if (!existsSync(OUT_DIR)) {
    console.error('out/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const data = build();
  console.log(process.argv.includes('--json') ? JSON.stringify(data, null, 2) : report(data));
}

// Guarded so the pure helpers above can be imported by a test without the
// report running (and exiting) as a side effect of the import.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { build, firstLoadByRoute, blockingByPage, imageWeight, unreferencedAssets, report };
