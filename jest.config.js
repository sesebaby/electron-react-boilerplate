module.exports = {
  // Test environment configuration
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // File extensions and patterns
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],

  // TypeScript transformation
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    // CSS and asset mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/types/**',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/public/**',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],

  // Coverage thresholds (as recommended in project analysis)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Stricter requirements for core business logic
    'src/services/business/**': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // More lenient for UI components
    'src/components/**': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // Coverage reporting
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover'
  ],
  coverageDirectory: 'coverage',

  // Test timeout
  testTimeout: 10000,

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Electron-specific mocks and globals
  globals: {
    'ts-jest': {
      useESM: false
    }
  },

  // Setup files
  setupFiles: ['<rootDir>/jest.polyfills.js'],

  // Error handling
  errorOnDeprecated: true,

  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',

  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/public/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|react-dnd|dnd-core|@react-dnd))'
  ]
};