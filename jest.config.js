module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    'bin/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    }
  },
  projects: [
    {
      displayName: 'main',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/main/**/*.test.js'],
      moduleNameMapper: {
        '^electron$': '<rootDir>/tests/mocks/electron.js'
      }
    },
    {
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/renderer/**/*.test.js']
    },
    {
      displayName: 'cli',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/cli/**/*.test.js']
    },
    {
      displayName: 'preload',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/preload/**/*.test.js'],
      moduleNameMapper: {
        '^electron$': '<rootDir>/tests/mocks/electron.js'
      }
    }
  ]
};
