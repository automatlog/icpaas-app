module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/'],
  // babel-preset-expo rewrites `process.env.EXPO_PUBLIC_*` into an import
  // from `expo/virtual/env`. That module ships pre-built with raw ESM that
  // Jest can't parse — shim it to a plain CommonJS export of process.env.
  moduleNameMapper: {
    '^expo/virtual/env$': '<rootDir>/jest.shims/expoVirtualEnv.js',
  },
};
