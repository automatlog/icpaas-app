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
};
