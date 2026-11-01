import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';

import ParticleBackground from '../../components/ParticleBackground';

// The canvas sits behind the hero and behind every status page, so a throw in
// its setup would take down the whole render. tests/setup.ts makes getContext
// return null for the rest of the suite; this file supplies a recording stub
// instead so the drawing loop can actually be driven.
let pendingFrames: FrameRequestCallback[] = [];
let context: Record<string, jest.Mock>;
let getContext: jest.Mock;

const realGetContext = HTMLCanvasElement.prototype.getContext;
const realMatchMedia = window.matchMedia;

function runFrame(): number {
  const batch = pendingFrames;
  pendingFrames = [];
  batch.forEach(frame => frame(0));
  return batch.length;
}

function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}

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

function canvas(): HTMLCanvasElement {
  return document.querySelector('canvas') as HTMLCanvasElement;
}

beforeEach(() => {
  pendingFrames = [];
  window.requestAnimationFrame = ((frame: FrameRequestCallback) =>
    pendingFrames.push(frame)) as unknown as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = jest.fn();

  context = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
  };
  getContext = jest.fn(() => context);
  HTMLCanvasElement.prototype.getContext =
    getContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

  window.matchMedia = realMatchMedia;
  setViewportSize(1024, 768);
  setTabHidden(false);
});

afterEach(() => {
  cleanup();
  HTMLCanvasElement.prototype.getContext = realGetContext;
  window.matchMedia = realMatchMedia;
});

test('the canvas is decorative and stays out of the accessibility tree', () => {
  render(<ParticleBackground />);
  expect(canvas()).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('img')).toBeNull();
});

test('the canvas is sized to the viewport and resized with the window', () => {
  render(<ParticleBackground />);

  // A canvas left at its 300x150 default would stretch the particles.
  expect(canvas().width).toBe(1024);
  expect(canvas().height).toBe(768);

  setViewportSize(1440, 900);
  window.dispatchEvent(new Event('resize'));

  expect(canvas().width).toBe(1440);
  expect(canvas().height).toBe(900);
});

test('a frame draws every particle and keeps the loop running', () => {
  render(<ParticleBackground />);

  expect(pendingFrames).toHaveLength(1);
  runFrame();

  expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1024, 768);
  expect(context.arc).toHaveBeenCalledTimes(50);
  // Each frame has to schedule the next one, or the field freezes.
  expect(pendingFrames).toHaveLength(1);
});

test('a phone-width viewport draws a smaller particle budget', () => {
  setViewportSize(500, 800);
  render(<ParticleBackground />);
  runFrame();

  // 50 particles plus their connecting lines is a measurable battery cost on a
  // phone, where the field is barely visible behind the hero copy.
  expect(context.arc).toHaveBeenCalledTimes(15);
});

test('a reduced-motion preference paints nothing at all', () => {
  mockReducedMotion(true);
  render(<ParticleBackground />);

  // Bailing before getContext also means no resize listener and no frame, so
  // the component costs nothing beyond the empty element.
  expect(getContext).not.toHaveBeenCalled();
  expect(pendingFrames).toHaveLength(0);
  expect(canvas().width).toBe(300);
});

test('a browser without matchMedia still animates', () => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
  render(<ParticleBackground />);

  expect(pendingFrames).toHaveLength(1);
});

test('a canvas with no 2D context is skipped rather than crashing the page', () => {
  getContext.mockReturnValue(null);
  expect(() => render(<ParticleBackground />)).not.toThrow();
  expect(pendingFrames).toHaveLength(0);
});

test('a getContext that throws is contained', () => {
  // Some privacy builds throw here instead of returning null, and this render
  // path is shared by the 404 and 500 pages.
  getContext.mockImplementation(() => {
    throw new Error('canvas blocked');
  });
  expect(() => render(<ParticleBackground />)).not.toThrow();
  expect(pendingFrames).toHaveLength(0);
});

test('a hidden tab holds the loop open but stops drawing', () => {
  render(<ParticleBackground />);
  runFrame();
  expect(context.clearRect).toHaveBeenCalledTimes(1);

  setTabHidden(true);
  runFrame();

  // Still scheduled, so the field resumes when the tab comes back...
  expect(pendingFrames).toHaveLength(1);
  // ...but no work was done while nobody could see it.
  expect(context.clearRect).toHaveBeenCalledTimes(1);
});

test('unmounting cancels the pending frame and drops the resize listener', () => {
  const removeEventListener = jest.spyOn(window, 'removeEventListener');
  const { unmount } = render(<ParticleBackground />);

  unmount();

  expect(window.cancelAnimationFrame).toHaveBeenCalled();
  expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

  // A leaked loop would keep drawing on a detached canvas for the life of the
  // tab, which is what navigating away from a status page used to do.
  const drawsBefore = context.clearRect.mock.calls.length;
  runFrame();
  expect(context.clearRect.mock.calls).toHaveLength(drawsBefore);

  removeEventListener.mockRestore();
});
