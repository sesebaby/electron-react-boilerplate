module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/integration/**/*.test.{ts,tsx}',
    '**/*.integration.test.{ts,tsx}'
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // 集成测试不使用 mock
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
};