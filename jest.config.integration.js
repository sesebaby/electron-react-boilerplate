module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/integration/**/*.test.{ts,tsx}',
    '**/*.integration.test.{ts,tsx}'
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^better-sqlite3$': '<rootDir>/tests/mocks/better-sqlite3.js',
  },
  // TypeScript和JSX配置
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  // 集成测试不使用 mock
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
};