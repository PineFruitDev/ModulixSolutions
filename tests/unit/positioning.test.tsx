import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';

import Home from '../../pages/index';
import ContactConfirmed from '../../pages/contact-confirmed';
import Custom404 from '../../pages/404';
import Custom500 from '../../pages/500';
import { PLATFORM_EXAMPLES, PLATFORM_NAMES, TAGLINES } from '../../lib/copy/positioning';

/**
 * Guards the positioning, which is the part of the copy most likely to drift
 * back: whoever writes the next headline will be thinking about whichever
 * platform is busiest that month.
 *
 * The rule being enforced: visible headline copy (the rotating taglines, and
 * every heading down to level 3) describes the user-generated content space,
 * and never a single platform. Platform names stay welcome everywhere else,
 * and the last two tests check they really are still there, so this cannot be
 * satisfied by scrubbing all the specifics out of the page.
 *
 * The page title and meta description are out of scope here; PR #13 reworks
 * them into the route manifest, and lib/copy/positioning.ts explains why this
 * does not touch them too.
 */

function mockReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

beforeEach(() => {
  // Rotation would otherwise swap the tagline heading mid-assertion. Each
  // tagline is checked from the exported list anyway, not from the DOM.
  mockReducedMotion(true);
});

afterEach(cleanup);

/**
 * Word-boundary matching, so "Discord" is caught but a word that merely
 * contains a platform name is not, and so a platform name is not matched
 * inside a URL path either way round.
 */
const mentions = (text: string) =>
  PLATFORM_NAMES.filter((platform) =>
    new RegExp(`\\b${platform.replace(/ /g, '\\s+')}\\b`, 'i').test(text)
  );

/**
 * Every heading text down to `level`. Queried rather than asserted on, because
 * the utility pages legitimately have no h2 or h3 at all.
 */
const headingsUpTo = (level: 1 | 2 | 3) =>
  [1, 2, 3]
    .filter((candidate) => candidate <= level)
    .flatMap((candidate) =>
      screen
        .queryAllByRole('heading', { level: candidate })
        .map((heading) => heading.textContent ?? '')
    );

describe('headline copy is not framed around a single platform', () => {
  test('every rotating tagline stands on its own without a platform', () => {
    // Each is read alone, so one platform-specific tagline is enough to
    // mis-position the company for whoever lands on it.
    for (const tagline of TAGLINES) {
      expect(mentions(tagline)).toEqual([]);
    }
  });

  test('no homepage heading down to level 3 names a platform', () => {
    render(<Home />);

    const offenders = headingsUpTo(3)
      .map((text) => ({ text, platforms: mentions(text) }))
      .filter((heading) => heading.platforms.length > 0);

    expect(offenders).toEqual([]);
  });

  test('the utility pages are positioned the same way', () => {
    // These are the pages a search engine or a mis-typed link lands on, so
    // they carry positioning too, and they are easy to forget.
    for (const Page of [ContactConfirmed, Custom404, Custom500]) {
      render(<Page />);
      expect(headingsUpTo(2).flatMap(mentions)).toEqual([]);
      cleanup();
    }
  });
});

describe('platforms are still named, as secondary examples', () => {
  test('the example lists name several platforms rather than one', () => {
    for (const examples of Object.values(PLATFORM_EXAMPLES)) {
      // Two or more is the whole point: a single-entry list is a headline
      // platform wearing an example's clothes.
      expect(mentions(examples).length).toBeGreaterThan(1);
    }
  });

  test('the homepage body copy keeps the concrete platform names', () => {
    render(<Home />);
    const body = document.body.textContent ?? '';

    // Guards the other failure mode: deleting every platform name would pass
    // the tests above and leave the page saying nothing specific at all.
    expect(mentions(body).length).toBeGreaterThan(2);
  });
});
