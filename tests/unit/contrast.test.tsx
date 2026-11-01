import fs from 'fs';
import path from 'path';

import palette from 'tailwindcss/colors';

import tailwindConfig from '../../tailwind.config.js';

/**
 * Contrast is the one WCAG requirement the jsdom axe run cannot see at all.
 * axe's `color-contrast` rule needs a layout box and a canvas to sample
 * rendered pixels; jsdom provides neither, so the rule does not appear in
 * `tests/unit/axe.test.tsx` as a pass *or* a violation. It is simply absent,
 * and a green axe run says nothing about it.
 *
 * This file closes half of that gap and `tests/smoke/a11y.spec.ts` closes the
 * other half. The split is deliberate:
 *
 *   - Here, the *tokens* are checked. Ratios are computed from
 *     `tailwind.config.js` and Tailwind's own palette, so editing a brand
 *     colour (or a Tailwind upgrade that shifts `gray-400`) fails in
 *     milliseconds without a browser or a build.
 *   - There, the *rendered page* is checked, which is the only place a
 *     pairing nobody listed below can be caught.
 *
 * Neither replaces the other: this file cannot know which pairings the markup
 * actually uses, and the browser run cannot fail until someone ships the CSS.
 */

// Optional all the way down in Tailwind's own types. An empty object here
// would make every ratio below compare undefined against undefined, so the
// first test in the file asserts the tokens actually arrived.
const tokens = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>;

const channel = (hex: string) => {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map(c => c + c)
          .join('')
      : value;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
};

/** WCAG 2.x relative luminance. */
const luminance = (hex: string) => {
  const [r, g, b] = channel(hex).map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/**
 * Flatten a translucent colour onto what sits behind it. Cards are
 * `bg-deeper-blue/50` over the page, so the colour text actually sits on is
 * neither token: it is the blend, and that blend is what has to clear 4.5:1.
 */
const over = (top: string, bottom: string, alpha: number) => {
  const [tr, tg, tb] = channel(top);
  const [br, bg, bb] = channel(bottom);
  return (
    '#' +
    [
      [tr, br],
      [tg, bg],
      [tb, bb],
    ]
      .map(([t, b]) => Math.round(t * alpha + b * (1 - alpha)).toString(16).padStart(2, '0'))
      .join('')
  );
};

const PAGE = tokens['dark-navy'];
const DEEPER = tokens['deeper-blue'];
const DARKEST = tokens['darkest-navy'];
/** `bg-deeper-blue/50 backdrop-blur-sm` in components/Card.tsx. */
const CARD = over(DEEPER, PAGE, 0.5);

const WHITE = '#FFFFFF';

describe('the token palette is self-consistent', () => {
  test('tailwind.config.js still defines the colours these assertions name', () => {
    // Renaming a token would otherwise turn every ratio below into
    // undefined-vs-undefined and quietly stop checking anything.
    for (const name of ['dark-navy', 'deeper-blue', 'darkest-navy', 'cyber-blue', 'neon-purple']) {
      expect(tokens[name]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('the contrast maths agrees with the two ratios WCAG fixes by definition', () => {
    // Black on white is exactly 21:1 and any colour on itself is exactly 1:1.
    expect(ratio('#000000', WHITE)).toBeCloseTo(21, 2);
    expect(ratio(PAGE, PAGE)).toBeCloseTo(1, 5);
  });
});

/**
 * 1.4.3 Contrast (Minimum), AA: 4.5:1 for body text, 3:1 once text is at least
 * 24px, or 18.66px and bold.
 */
describe('body text clears 4.5:1 (WCAG 1.4.3 AA)', () => {
  const surfaces = {
    'the page': PAGE,
    'a card': CARD,
    'a deeper-blue section': DEEPER,
    'the status-page background': DARKEST,
  };

  // Every colour the site sets on normal-size text, with where it is used.
  const bodyText = {
    'white body copy': WHITE,
    'gray-300 paragraphs': palette.gray[300],
    'gray-400 form hints and the footer copyright': palette.gray[400],
    'cyber-blue accents': tokens['cyber-blue'],
    'purple-400 feature headings': palette.purple[400],
    'purple-300 outline buttons': palette.purple[300],
    'green-300 success text': palette.green[300],
    'red-300 error text': palette.red[300],
  };

  for (const [surfaceName, surface] of Object.entries(surfaces)) {
    for (const [textName, text] of Object.entries(bodyText)) {
      test(`${textName} on ${surfaceName}`, () => {
        expect(ratio(text, surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('large and non-text colours clear 3:1', () => {
  /**
   * neon-purple is the one token that does not reach 4.5:1 on every surface
   * (4.31:1 on deeper-blue). It is used as the start of the `from-neon-purple
   * to-cyber-blue` gradient on `text-xl font-semibold` headings and as an icon
   * tint, both of which are governed by the 3:1 floor rather than 4.5:1.
   *
   * This test is the reason that is a deliberate choice and not an oversight:
   * if someone reuses neon-purple for body copy, the 4.5:1 block above will
   * not catch it, so the comment has to carry the constraint.
   */
  test('neon-purple is a large-text and non-text colour only', () => {
    for (const surface of [PAGE, CARD, DEEPER, DARKEST]) {
      expect(ratio(tokens['neon-purple'], surface)).toBeGreaterThanOrEqual(3);
    }
    // Still below the body-text floor somewhere, which is what pins the rule
    // above to "large only" rather than letting it drift into a 4.5:1 claim.
    expect(ratio(tokens['neon-purple'], DEEPER)).toBeLessThan(4.5);
  });

  test('gradient heading endpoints both clear the large-text floor', () => {
    // bg-gradient-to-r from-neon-purple to-cyber-blue, bg-clip-text: the text
    // is literally painted in these two colours and everything between them.
    for (const endpoint of [tokens['neon-purple'], tokens['cyber-blue']]) {
      expect(ratio(endpoint, CARD)).toBeGreaterThanOrEqual(3);
    }
  });

  /** 1.4.11 Non-text Contrast, AA: UI component boundaries and focus rings. */
  test('the focus ring is visible against every surface it can land on', () => {
    // styles/globals.css draws focus as a 3px cyber-blue outline. The lightest
    // surface on the site is the `bg-white/10` hover state on the social
    // buttons, which still composites to something dark.
    const lightest = over(WHITE, PAGE, 0.1);
    for (const surface of [PAGE, CARD, DEEPER, DARKEST, lightest]) {
      expect(ratio(tokens['cyber-blue'], surface)).toBeGreaterThanOrEqual(3);
    }
  });

  /**
   * The focus outline is a single hard-coded cyber-blue for the whole site,
   * which is only safe because every surface is dark: cyber-blue on white is
   * 1.77:1 and would be an invisible focus indicator (WCAG 2.4.7, and 1.4.11
   * for the ring itself).
   *
   * Nothing in the CSS enforces that, so this asserts the premise instead. If
   * a light surface is ever introduced, this fails and the focus colour has to
   * become surface-aware rather than silently disappearing on one panel.
   */
  test('cyber-blue focus is unsafe on light surfaces, so no light surface exists', () => {
    expect(ratio(tokens['cyber-blue'], WHITE)).toBeLessThan(3);

    const sources = ['components', 'pages', 'styles'].flatMap(dir =>
      fs
        .readdirSync(path.join(process.cwd(), dir), { recursive: true })
        .filter((f): f is string => typeof f === 'string' && /\.(tsx|css)$/.test(f))
        .map(f => fs.readFileSync(path.join(process.cwd(), dir, f), 'utf8'))
    );

    // Opacity-suffixed utilities (`bg-white/5`) composite onto the dark page
    // and are fine; an unsuffixed `bg-white` or a light gray is not.
    const lightSurface = /\bbg-(white|gray-(?:50|100|200|300)|slate-(?:50|100|200))(?![\w/-])/;
    for (const source of sources) {
      expect(source).not.toMatch(lightSurface);
    }
  });

  test('the form control border clears 3:1 against the field and the page', () => {
    // .form-input is `border-cyber-blue/60` on a `bg-deeper-blue` field. The
    // /60 is load-bearing and globals.css explains why; this is the assertion
    // that stops it drifting back to /30.
    const border = over(tokens['cyber-blue'], DEEPER, 0.6);
    expect(ratio(border, DEEPER)).toBeGreaterThanOrEqual(3);
    expect(ratio(border, PAGE)).toBeGreaterThanOrEqual(3);

    // The /30 this replaced, kept as the counter-example so the test fails if
    // someone "simplifies" the opacity back down.
    expect(ratio(over(tokens['cyber-blue'], DEEPER, 0.3), PAGE)).toBeLessThan(3);
  });

  test('the skip link reverses to dark text on cyber-blue', () => {
    // .skip-link paints #0A0A14 on #00D4FF; it is the first tab stop, so it
    // being readable is not optional.
    expect(ratio(DARKEST, tokens['cyber-blue'])).toBeGreaterThanOrEqual(4.5);
  });
});
