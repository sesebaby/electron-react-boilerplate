module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/core/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/index.tsx',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    // 核心服务必须100%覆盖
    'src/services/core/InventoryService.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/services/core/OrderService.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/services/core/FinancialService.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // 其他模块合理覆盖
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.(ts|tsx)', '**/*.(test|spec).(ts|tsx)'],
  testTimeout: 10000,
}; 