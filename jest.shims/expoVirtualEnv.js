// Jest shim for `expo/virtual/env`.
//
// babel-preset-expo transforms `process.env.EXPO_PUBLIC_*` references into
// `import { env } from 'expo/virtual/env'`. The real module ships pre-built
// with raw ESM `export` statements that Jest's babel-jest doesn't transform
// (default transformIgnorePatterns excludes node_modules), so it crashes on
// the `export` token.
//
// This shim returns plain process.env in the same shape the real module
// exports, keeping `process.env.EXPO_PUBLIC_*` reads working under Jest.
module.exports = { env: process.env };
