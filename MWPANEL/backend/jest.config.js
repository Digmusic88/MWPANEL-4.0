module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // isolatedModules: transpila cada fichero aislado (sin type-check cruzado en jest).
  // Decisión deliberada: el type-check de producción lo hace `nest build`; en jest
  // acelera y evita fallos de worker por memoria al correr varias suites con type-check completo.
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/polyfills.ts',
    '!**/*.interface.ts',
    '!**/database/migrations/**',
    '!**/database/seeds/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
};