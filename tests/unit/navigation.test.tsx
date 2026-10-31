import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import Header from '../../components/Header';

// The header animates the scroll itself rather than delegating to CSS
// scroll-behaviour, so these tests drive requestAnimationFrame with explicit
// timestamps. Letting a clock decide how far each frame advanced would make the
// eased positions unassertable.
let pendingFrames: FrameRequestCallback[] = [];

/** Runs every frame scheduled so far at `timestamp`; returns how many ran. */
function runFrame(timestamp: number): number {
  const batch = pendingFrames;
  pendingFrames = [];
  batch.forEach(frame => frame(timestamp));
  return batch.length;
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

function setScrollPosition(y: number) {
  Object.defineProperty(window, 'pageYOffset', { configurable: true, value: y });
}

/** Gives the sticky desktop bar a height, which jsdom reports as 0. */
function setStickyHeaderHeight(height: number) {
  const bar = document.querySelector('.site-header');
  Object.defineProperty(bar, 'offsetHeight', { configurable: true, value: height });
}

/**
 * Adds a scroll target with a stubbed box, because jsdom performs no layout and
 * would report every section at the top of the viewport.
 */
function placeSection(id: string, viewportTop: number) {
  const section = document.createElement('section');
  section.id = id;
  document.body.appendChild(section);
  section.getBoundingClientRect = () => ({ top: viewportTop }) as DOMRect;
  return section;
}

/** The y value of the most recent scroll, or undefined if none happened. */
function lastScrollY(): number | undefined {
  const { calls } = (window.scrollTo as unknown as jest.Mock).mock;
  return calls.length ? calls[calls.length - 1][1] : undefined;
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  window.matchMedia = realMatchMedia;
  pendingFrames = [];
  window.requestAnimationFrame = ((frame: FrameRequestCallback) =>
    pendingFrames.push(frame)) as unknown as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = jest.fn();
  // jsdom implements neither scrollTo nor layout, and logs a "not implemented"
  // error for every call it is asked to make.
  window.scrollTo = jest.fn();
  setViewportWidth(1024);
  setScrollPosition(0);
});

afterEach(() => {
  cleanup();
  document.querySelectorAll('section[id]').forEach(node => node.remove());
});

describe('in-page navigation', () => {
  test('a desktop nav click eases to the section and clears the sticky header', () => {
    render(<Header />);
    setStickyHeaderHeight(80);
    placeSection('services', 1000);

    fireEvent.click(screen.getByRole('link', { name: 'Services' }));

    // The section sits 1000px down the page and the bar covering the top 80px
    // of it is fixed, so the resting place is 920 rather than 1000.
    runFrame(0);
    expect(lastScrollY()).toBe(0);

    // duration = min(920 * 0.8, 1000) = 736ms, and the ease is symmetric, so
    // the midpoint of the time is the midpoint of the distance.
    runFrame(368);
    expect(lastScrollY()).toBe(460);

    runFrame(736);
    expect(lastScrollY()).toBe(920);

    // Arriving ends the loop instead of scheduling frames forever.
    expect(runFrame(1000)).toBe(0);
  });

  test('a long jump is capped at one second rather than scaling with distance', () => {
    render(<Header />);
    setStickyHeaderHeight(0);
    placeSection('faq', 40000);

    fireEvent.click(screen.getByRole('link', { name: 'FAQ' }));

    // Unclamped this would run for 32 seconds.
    runFrame(0);
    runFrame(1000);
    expect(lastScrollY()).toBe(40000);
    expect(runFrame(2000)).toBe(0);
  });

  test('scrolling from the drawer ignores the header, which is hidden on mobile', () => {
    setViewportWidth(500);
    render(<Header />);
    setStickyHeaderHeight(80);
    placeSection('about', 1000);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Site menu' });
    fireEvent.click(within(drawer).getByRole('link', { name: 'About' }));

    // Below md the sticky bar is display:none, so subtracting its height would
    // leave the heading 80px above the top of the viewport.
    runFrame(0);
    runFrame(800);
    expect(lastScrollY()).toBe(1000);

    // Navigating has to dismiss the drawer, or it covers the destination.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('clicking the section the page already rests on holds its position', () => {
    render(<Header />);
    setStickyHeaderHeight(80);
    // Second click on the same item: the first one left the page exactly here.
    setScrollPosition(920);
    placeSection('services', 80);

    fireEvent.click(screen.getByRole('link', { name: 'Services' }));
    runFrame(0);

    // A zero-length jump gives a zero-length duration, and dividing the elapsed
    // time by it yields NaN. Browsers normalise a non-finite scroll offset to
    // 0, so the page would be thrown to the very top.
    expect(lastScrollY()).toBe(920);
    expect(runFrame(100)).toBe(0);
  });

  test('a nav target that is not on the page scrolls nowhere and still closes the drawer', () => {
    setViewportWidth(500);
    render(<Header />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog');
    fireEvent.click(within(drawer).getByRole('link', { name: 'Services' }));

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(pendingFrames).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the status-page header routes home instead of scrolling', () => {
    render(<Header simple />);

    // Status pages have no sections to scroll to, so the only item is a real
    // navigation to "/" and the in-page animation must not run.
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const items = within(nav).getAllByRole('link');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute('href', '/');

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Home' }));

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('drawer and breakpoint', () => {
  test('opening on a viewport already past md closes it again immediately', () => {
    // A desktop user who triggers the toggle with a keyboard shortcut or a
    // stale tap would otherwise lock scrolling behind an invisible drawer.
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  test('a browser with only the deprecated listener API still closes at md', () => {
    // Safari below 14 exposes addListener but not addEventListener.
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];
    const removeListener = jest.fn();
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (handler: (event: MediaQueryListEvent) => void) => {
        if (query.includes('min-width')) listeners.push(handler);
      },
      removeListener,
      dispatchEvent: jest.fn(),
    }));

    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(listeners).toHaveLength(1);

    act(() => {
      listeners.forEach(handler => handler({ matches: true } as MediaQueryListEvent));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(removeListener).toHaveBeenCalled();
  });

  test('Tab pulls focus back in when it has escaped the drawer entirely', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const drawer = screen.getByRole('dialog');
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button'));

    // A click on the overlay, or a browser restoring focus after an alert,
    // leaves document.activeElement outside the drawer while it is still open.
    (document.activeElement as HTMLElement).blur();
    expect(drawer.contains(document.activeElement)).toBe(false);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(focusable[0]).toHaveFocus();

    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(focusable[focusable.length - 1]).toHaveFocus();
  });

  test('keys other than Tab and Escape are left to the browser', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // Nothing is trapped or redirected, so the drawer still scrolls normally.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(closeButton).toHaveFocus();
  });

  test('a browser without matchMedia keeps the drawer usable', () => {
    // The effect bails out early here, so the only way out is the UI itself.
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });

    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });
});
