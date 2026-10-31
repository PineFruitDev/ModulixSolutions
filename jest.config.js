const nextJest = require('next/jest');
module.exports = nextJest({ dir: './' })({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/unit/**/*.test.tsx'],
  clearMocks: true,
  // Every source file is reported, not just the ones a test happens to import,
  // so a component nobody uses shows up as the 0% it is.
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    // _document renders no DOM outside a Next build; `next build` in the smoke
    // suite is what proves it.
    '!pages/_document.tsx',
  ],
  // A ratchet, set just below the current numbers. It is meant to catch a drop,
  // not to be edged upward one point at a time.
  coverageThreshold: {
    global: { statements: 90, branches: 88, functions: 90, lines: 92 },
  },
});
