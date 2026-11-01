# Byte budgets

`npm run perf:budgets` builds the static export and measures it against
`byte-budgets.json`. `.github/workflows/byte-budgets.yml` runs it on every pull
request. `npm run perf:report` prints the same measurements with no budget
comparison, which is how you pick the next set of numbers.

Sizes are what a host actually puts on the wire: text gzipped, because every
static host compresses it, and woff2/png/jpg raw, because they are already
compressed and gzipping them makes them marginally larger. Compression uses
`node:zlib` rather than the `gzip` binary so a local run and a CI run agree.

## What is budgeted

**Page critical path.** For each exported page, the bytes a first-time visitor
receives before the page renders: the document, the one render-blocking
stylesheet, the scripts the document loads, and the fonts it preloads. This is
the number that moves LCP, and it is why per-chunk budgets are not enough on
their own: splitting one 50 kB chunk into five 10 kB chunks passes every
per-chunk budget while changing nothing a visitor experiences.

**Per asset.** Glob rules over the export, so a single file that balloons is
caught even off the critical path. The OG card and the schema logo are only
ever fetched by crawlers, but they are still bytes this repo ships.

**Unbudgeted ceiling.** Any file no rule matches that is larger than
`unbudgetedFileCeiling` (16 kB) fails the run. Without it the other two checks
only cover what someone remembered to list, and a new 2 MB hero video lands
green. Adding weight is allowed; adding it silently is not.

The run also fails when a budget's pattern stops matching anything, so a
renamed or deleted asset surfaces as a failure rather than as a check that
quietly measures nothing.

Budgets sit a few percent above the measured numbers, the same ratchet as the
coverage thresholds in `jest.config.js`: they catch a regression, they are not
meant to be nudged up a few hundred bytes at a time. When an increase is
intended, raise the number in the same commit so it is reviewed as a change.

## Measured at the time these budgets were set

| | transfer |
|---|---|
| Homepage critical path | 229.5 kB |
| Other pages, critical path | ~198.5 kB |
| All JavaScript (11 chunks) | 183.8 kB |
| Stylesheet | 7.0 kB |
| Fonts a visitor fetches | 62.6 kB |
| Export total, 53 files | 1532.7 kB |

## Notes on the things that look wrong and are not

**`polyfills-*.js` (38.6 kB) is excluded from the critical-path totals.** Next
ships it with the `nomodule` attribute, so no module-supporting browser ever
requests it. It still has its own asset budget, because it is deploy weight
even though it is not visitor weight.

**Nine woff2 files total 230.6 kB, but a visitor fetches two of them (62.6 kB).**
`next/font`'s `subsets` option decides what gets *preloaded*, not what gets
downloaded. Google returns an `@font-face` block per subset and `next/font`
emits all of them, so the latin-ext, cyrillic, cyrillic-ext, greek, greek-ext
and vietnamese cuts of Inter ship unreferenced by any `<link rel=preload>` and
are fetched only if a glyph in those ranges actually renders, which on an
English-language site means never. There is no `next/font` option to stop
emitting them. Only the two latin files (Inter 48.4 kB, Lato 14.2 kB) are
preloaded and only those are counted against a page.

All four Inter weights (400/500/600/700) resolve to the same files: it is a
variable font, so dropping a weight from the `Inter()` call would save nothing.

**`modulix-icon.png` is 441.5 kB.** It is referenced only by the `Organization`
structured data in `lib/seo/site.ts`, so crawlers fetch it and visitors do not.
It is larger than it needs to be at 1551x1549, but `lib/seo/site.ts` pins those
dimensions and a unit test reads them back out of the PNG header, so
re-encoding it is a deliberate change to make with that test in hand rather
than a side effect of a size pass.

**The stylesheet is one render-blocking file and should stay that way.** At
7.0 kB gzipped it is cheaper to ship in the document's blocking path than to
split, inline or defer. Tailwind purges against the `content` globs in
`tailwind.config.js`, so it tracks classes actually referenced rather than the
framework.
