import '@testing-library/jest-dom';
// jsdom has no layout; browser smoke tests exercise real viewport animations.
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;

// jsdom implements no 2D context. The particle background already bails out
// when getContext returns null, so this only silences the warning that every
// page render would otherwise emit.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
