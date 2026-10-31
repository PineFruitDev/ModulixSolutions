import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';

import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

// Everything that rotates on a timer reads this hook, so a wrong answer here
// means motion the user explicitly asked not to see.
function Probe() {
  return <span data-testid="pref">{String(usePrefersReducedMotion())}</span>;
}

function reported(): string {
  return screen.getByTestId('pref').textContent as string;
}

const realMatchMedia = window.matchMedia;

type Handler = (event: MediaQueryListEvent) => void;

/** A MediaQueryList exposing only the modern listener API. */
function modernMatchMedia(matches: boolean) {
  const handlers: Handler[] = [];
  const removeEventListener = jest.fn();
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_: string, handler: Handler) => handlers.push(handler),
    removeEventListener,
    dispatchEvent: jest.fn(),
  }));
  return { handlers, removeEventListener };
}

/** A MediaQueryList as Safari below 14 exposes it: addListener only. */
function legacyMatchMedia(matches: boolean) {
  const handlers: Handler[] = [];
  const removeListener = jest.fn();
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: (handler: Handler) => handlers.push(handler),
    removeListener,
    dispatchEvent: jest.fn(),
  }));
  return { handlers, removeListener };
}

afterEach(() => {
  cleanup();
  window.matchMedia = realMatchMedia;
});

test('a reduce preference is reported once the effect has corrected the state', () => {
  // The hook deliberately starts false so the static export and the first
  // client render agree, then corrects after mount. Testing Library flushes
  // effects, so only the corrected value is observable here.
  modernMatchMedia(true);
  render(<Probe />);
  expect(reported()).toBe('true');
});

test('a browser without matchMedia is treated as having no preference', () => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
  render(<Probe />);
  expect(reported()).toBe('false');
});

test('no preference is reported when the query does not match', () => {
  modernMatchMedia(false);
  render(<Probe />);
  expect(reported()).toBe('false');
});

test('turning the preference on mid-session is picked up', () => {
  const { handlers } = modernMatchMedia(false);
  render(<Probe />);
  expect(reported()).toBe('false');

  act(() => handlers.forEach(handler => handler({ matches: true } as MediaQueryListEvent)));
  expect(reported()).toBe('true');

  // And back off again, so a user toggling the OS setting is not stuck.
  act(() => handlers.forEach(handler => handler({ matches: false } as MediaQueryListEvent)));
  expect(reported()).toBe('false');
});

test('unmounting detaches the modern listener', () => {
  const { removeEventListener } = modernMatchMedia(false);
  const { unmount } = render(<Probe />);
  unmount();
  expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
});

test('the deprecated listener API is used when it is the only one available', () => {
  const { handlers, removeListener } = legacyMatchMedia(false);
  const { unmount } = render(<Probe />);
  expect(handlers).toHaveLength(1);

  act(() => handlers.forEach(handler => handler({ matches: true } as MediaQueryListEvent)));
  expect(reported()).toBe('true');

  unmount();
  expect(removeListener).toHaveBeenCalledWith(expect.any(Function));
});
