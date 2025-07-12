module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/contract'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'public/database/handlers/**/*.js',
    'public/preload.js',
    '!public/database/handlers/**/*.test.js',
  ],
  coverageDirectory: 'coverage/contract',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
};