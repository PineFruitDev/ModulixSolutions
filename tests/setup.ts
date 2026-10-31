import '@testing-library/jest-dom';
// jsdom has no layout; browser smoke tests exercise real viewport animations.
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;
