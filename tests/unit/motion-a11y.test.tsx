import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import Header from '../../components/Header';
import Home from '../../pages/index';
// Read from the copy module rather than repeated verbatim: this test is about
// the rotation, so a reworded tagline should not fail it.
import { TAGLINES } from '../../lib/copy/positioning';

const TAGLINE_INTERVAL_MS = 3500;
const BOT_FEATURE_INTERVAL_MS = 7500;

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
  jest.useFakeTimers();
  mockReducedMotion(false);
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('auto-rotating content can be paused (WCAG 2.2.2)', () => {
  test('taglines rotate on an interval and the pause control stops them', () => {
    render(<Home />);
    const first = screen.getByRole('heading', { level: 2, name: TAGLINES[0] });
    expect(first).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(TAGLINE_INTERVAL_MS); });
    expect(screen.getByRole('heading', { level: 2, name: TAGLINES[1] })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause rotating taglines' }));
    act(() => { jest.advanceTimersByTime(TAGLINE_INTERVAL_MS * 3); });
    expect(screen.getByRole('heading', { level: 2, name: TAGLINES[1] })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume rotating taglines' }));
    act(() => { jest.advanceTimersByTime(TAGLINE_INTERVAL_MS); });
    expect(screen.getByRole('heading', { level: 2, name: TAGLINES[2] })).toBeInTheDocument();
  });

  test('the feature carousel reports position and its pause control holds the slide', () => {
    render(<Home />);
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(BOT_FEATURE_INTERVAL_MS); });
    expect(screen.getByText('Feature 2 of 10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause feature rotation' }));
    act(() => { jest.advanceTimersByTime(BOT_FEATURE_INTERVAL_MS * 4); });
    expect(screen.getByText('Feature 2 of 10')).toBeInTheDocument();
  });

  test('only the active carousel slide is exposed to assistive tech', () => {
    const { container } = render(<Home />);

    // All ten slides stay mounted for the cross-fade...
    const rendered = container.querySelectorAll('[aria-roledescription="slide"]');
    expect(rendered).toHaveLength(10);

    // ...but aria-hidden keeps the nine inactive ones out of the a11y tree,
    // so a screen reader does not read all ten feature cards in a row.
    const exposed = screen
      .getAllByRole('group')
      .filter(node => node.getAttribute('aria-roledescription') === 'slide');
    expect(exposed).toHaveLength(1);
    expect(exposed[0]).toHaveAttribute('aria-label', '1 of 10: Infinite Customization');
  });

  test('a reduced-motion preference stops rotation and drops the pause controls', () => {
    mockReducedMotion(true);
    render(<Home />);

    act(() => { jest.advanceTimersByTime(TAGLINE_INTERVAL_MS * 4); });
    expect(screen.getByRole('heading', { level: 2, name: TAGLINES[0] })).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(BOT_FEATURE_INTERVAL_MS * 4); });
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rotating taglines/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /feature rotation/ })).not.toBeInTheDocument();
  });

  test('every feature stays reachable under reduced motion, where rotation never runs', () => {
    mockReducedMotion(true);
    render(<Home />);

    // Rotation is off, so the stepper is the only path to the other nine cards.
    const next = screen.getByRole('button', { name: 'Next feature' });
    for (let i = 2; i <= 10; i++) {
      fireEvent.click(next);
      expect(screen.getByText(`Feature ${i} of 10`)).toBeInTheDocument();
    }

    // Tenth wraps back to the first.
    fireEvent.click(next);
    expect(screen.getByText('Feature 1 of 10')).toBeInTheDocument();

    // And backwards from the first wraps to the tenth.
    fireEvent.click(screen.getByRole('button', { name: 'Previous feature' }));
    expect(screen.getByText('Feature 10 of 10')).toBeInTheDocument();
  });
});

describe('mobile menu keyboard handling', () => {
  test('opening moves focus into the drawer and closing restores it to the toggle', () => {
    render(<Header />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });

    fireEvent.click(toggle);
    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  test('Escape closes the drawer', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Tab cycles within the drawer instead of reaching the page behind it', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first).toHaveFocus();

    // Shift+Tab off the first element wraps to the last.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    // Tab off the last element wraps back to the first.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
  });

  test('growing past the md breakpoint closes the drawer and releases the scroll lock', () => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
        if (query.includes('min-width')) listeners.push(handler);
      },
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.body.style.overflow).toBe('hidden');

    // A phone rotated to landscape crosses md, where the drawer and both close
    // affordances are display:none. The lock has to come off with them.
    act(() => {
      listeners.forEach(handler => handler({ matches: true } as MediaQueryListEvent));
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  test('the drawer keeps a navigation landmark distinct from the desktop nav', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });
});
