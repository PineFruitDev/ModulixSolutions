/**
 * Byte budgets for the static export.
 *
 * Run after `next build` (the export lands in `out/`). Three kinds of check,
 * because "the site got heavier" happens in three different ways:
 *
 *  1. PAGE CRITICAL PATH. For every exported HTML page, the bytes a first-time
 *     visitor has to receive before the page is rendered and laid out: the
 *     document, the one render-blocking stylesheet, the scripts the document
 *     loads, and the fonts it preloads. This is the number that moves LCP, and
 *     it is the reason a budget on individual chunks is not enough: splitting
 *     one 50 kB chunk into five 10 kB chunks passes a per-chunk budget while
 *     changing nothing a visitor experiences.
 *
 *  2. PER-ASSET. Glob rules over the export, so a single image or chunk that
 *     balloons is caught even when it is not on a critical path (the OG card
 *     and the schema logo are only ever fetched by crawlers, but they are
 *     still bytes this repo ships).
 *
 *  3. UNBUDGETED CEILING. Any file that no rule matches and that is larger
 *     than `unbudgetedFileCeiling` fails the run. Without this the first two
 *     checks only cover what someone remembered to list, and a new 2 MB hero
 *     video lands green. Adding weight is allowed; adding it silently is not.
 *
 * Budgets live in `docs/performance/byte-budgets.json` and are set just above
 * the measured numbers, the same ratchet as the coverage thresholds in
 * jest.config.js: they are meant to catch a regression, not to be nudged up a
 * few hundred bytes at a time. `--report` prints the measurements with no
 * budget comparison, which is how you pick the next set.
 *
 * Sizes are what a host actually puts on the wire. Text is measured gzipped,
 * because every static host compresses it; woff2, png and jpg are measured raw,
 * because they are already compressed and gzipping them makes them very
 * slightly larger. Compression is done with node:zlib rather than the gzip
 * binary so a local run and a CI run agree.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const config = require('../docs/performance/byte-budgets.json');
const ROOT = path.join(__dirname, '..');
const EXPORT_DIR = path.join(ROOT, config.exportDir);
const REPORT_ONLY = process.argv.includes('--report');

/** Extensions a static host serves compressed. Everything else is sent as-is. */
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml', '.ico']);

/** Bytes this file costs over the wire: gzipped if the host would compress it. */
function transferSize(absolute) {
  const body = fs.readFileSync(absolute);
  if (!COMPRESSIBLE.has(path.extname(absolute).toLowerCase())) return body.length;
  return zlib.gzipSync(body, { level: 9 }).length;
}

/** Every file in the export, as paths relative to it, with forward slashes. */
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute, base);
    return [path.relative(base, absolute).split(path.sep).join('/')];
  });
}

/**
 * Glob to RegExp, supporting a single star (matching within one path segment)
 * and a double star (matching across separators). Enough for the rule
 * patterns, and not a dependency.
 *
 * A double star as its own segment matches zero or more directories, so the
 * chunks pattern in the budget file covers both a chunk sitting directly in
 * `chunks/` and one nested under `chunks/pages/`.
 */
function globToRegExp(pattern) {
  let source = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith('/**/', i)) {
      source += '/(?:.*/)?';
      i += 4;
    } else if (pattern.startsWith('**', i)) {
      source += '.*';
      i += 2;
    } else if (pattern[i] === '*') {
      source += '[^/]*';
      i += 1;
    } else {
      source += pattern[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}

function formatBytes(n) {
  return `${(n / 1024).toFixed(1)} kB`;
}

const failures = [];
const lines = [];

function record(label, used, budget, detail) {
  if (REPORT_ONLY || budget == null) {
    lines.push(`  ${label.padEnd(44)} ${formatBytes(used).padStart(10)}  ${detail ?? ''}`.trimEnd());
    return;
  }
  const over = used > budget;
  const slack = budget - used;
  const marker = over ? 'FAIL' : 'ok  ';
  const headroom = over ? `over by ${formatBytes(-slack)}` : `${formatBytes(slack)} left`;
  lines.push(`  ${marker} ${label.padEnd(44)} ${formatBytes(used).padStart(10)} / ${formatBytes(budget).padStart(10)}  ${headroom}`);
  if (over) failures.push(`${label}: ${used} B exceeds the ${budget} B budget by ${used - budget} B`);
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(EXPORT_DIR)) {
  console.error(`No export at ${config.exportDir}/. Run \`npm run build\` first.`);
  process.exit(1);
}

const files = walk(EXPORT_DIR);
const sizes = new Map(files.map(file => [file, transferSize(path.join(EXPORT_DIR, file))]));

/**
 * Resolve a URL the document references to a path inside the export. Next
 * emits root-relative URLs, so only those need handling; anything
 * cross-origin is somebody else's bytes and is skipped.
 */
function resolveAsset(url) {
  if (!url.startsWith('/')) return null;
  const clean = url.split(/[?#]/)[0].replace(/^\//, '');
  return sizes.has(clean) ? clean : null;
}

/** The subresources an exported page blocks on, read back out of its markup. */
function criticalPath(html) {
  const assets = [];

  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
    // `nomodule` is how Next ships the legacy polyfill bundle. Any browser
    // that supports modules (all of them, for this site's support matrix)
    // never requests it, so counting it would budget bytes nobody downloads.
    if (/\bnomodule\b/.test(tag)) continue;
    const src = tag.match(/\bsrc="([^"]+)"/);
    const asset = src && resolveAsset(src[1]);
    if (asset) assets.push(asset);
  }

  for (const tag of html.match(/<link\b[^>]*>/g) ?? []) {
    const rel = tag.match(/\brel="([^"]+)"/)?.[1];
    const href = tag.match(/\bhref="([^"]+)"/)?.[1];
    if (!href) continue;
    // A preload is a deliberate "fetch this now", so preloaded fonts count.
    // `rel="preload" as="style"` is dropped: Next emits it alongside the
    // stylesheet link for the same file, and charging for it would double it.
    const counts =
      rel === 'stylesheet' || (rel === 'preload' && /\bas="font"/.test(tag));
    if (!counts) continue;
    const asset = resolveAsset(href);
    if (asset) assets.push(asset);
  }

  return [...new Set(assets)];
}

lines.push('Page critical path (document + blocking CSS + scripts + preloaded fonts)');

const pageBudgets = new Map(Object.entries(config.pages ?? {}));
const pages = files.filter(file => file.endsWith('.html')).sort();
const unknownPages = [];

for (const page of pages) {
  const html = fs.readFileSync(path.join(EXPORT_DIR, page), 'utf8');
  const assets = criticalPath(html);
  const total = sizes.get(page) + assets.reduce((sum, asset) => sum + sizes.get(asset), 0);
  const budget = pageBudgets.get(page);
  if (budget == null && !REPORT_ONLY) unknownPages.push(page);
  record(page, total, budget, `${assets.length} subresources`);
  pageBudgets.delete(page);
}

for (const [page] of pageBudgets) {
  failures.push(`${page}: has a budget but was not exported (renamed or removed?)`);
}
for (const page of unknownPages) {
  failures.push(`${page}: exported page has no budget. Add one under "pages".`);
}

lines.push('');
lines.push('Assets');

const matchedByRule = new Set();

for (const rule of config.rules) {
  const pattern = globToRegExp(rule.pattern);
  const matches = files.filter(file => pattern.test(file)).sort();
  matches.forEach(file => matchedByRule.add(file));

  if (matches.length < (rule.minMatches ?? 1)) {
    failures.push(
      `${rule.label}: pattern "${rule.pattern}" matched ${matches.length} file(s), expected at least ${rule.minMatches ?? 1} (renamed or removed?)`
    );
    continue;
  }

  if (rule.mode === 'sum') {
    const total = matches.reduce((sum, file) => sum + sizes.get(file), 0);
    record(`${rule.label} (${matches.length} files)`, total, rule.budget, rule.pattern);
  } else {
    for (const file of matches) record(file, sizes.get(file), rule.budget, rule.label);
  }
}

const unbudgeted = files
  .filter(file => !matchedByRule.has(file) && !file.endsWith('.html'))
  .filter(file => sizes.get(file) > config.unbudgetedFileCeiling)
  .sort((a, b) => sizes.get(b) - sizes.get(a));

for (const file of unbudgeted) {
  failures.push(
    `${file}: ${sizes.get(file)} B is over the ${config.unbudgetedFileCeiling} B ceiling for files no budget rule covers. Add a rule for it.`
  );
}

lines.push('');
lines.push(`Export total: ${formatBytes([...sizes.values()].reduce((a, b) => a + b, 0))} over ${files.length} files`);

console.log(lines.join('\n'));

if (REPORT_ONLY) process.exit(0);

if (failures.length) {
  console.error(`\n${failures.length} budget failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    '\nIf the new weight is intended, raise the number in docs/performance/byte-budgets.json\nin the same commit, so the increase is reviewed as a change rather than absorbed.'
  );
  process.exit(1);
}

console.log('\nAll byte budgets met.');
