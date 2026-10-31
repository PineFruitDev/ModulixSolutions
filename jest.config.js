const nextJest = require('next/jest');
module.exports = nextJest({ dir: './' })({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/unit/**/*.test.tsx'],
  clearMocks: true,
});
