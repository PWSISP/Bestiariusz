// Style and architecture rules. A rule in a later block replaces the same rule from an earlier
// block (options are not merged), so layer-specific blocks repeat the general restrictions.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const mathRandom = {
  object: 'Math',
  property: 'random',
  message: 'Use the injected Rng (src/core/rng.ts) instead of Math.random.',
};
const dateNow = {
  object: 'Date',
  property: 'now',
  message: 'Game logic must not read the clock; use the injected clock instead of Date.now.',
};
const nodeBuiltins = {
  group: ['node:*'],
  message: 'Node APIs are not available in the app; move this code to tools/ or tests/.',
};

export default defineConfig(
  {
    ignores: [
      'dist',
      'android',
      'ios',
      'results',
      'runs',
      'test-results',
      'playwright-report',
      'node_modules',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tools/**/*.mjs', '*.config.*'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', mathRandom],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'Node globals are not available in the app.' },
        { name: 'Buffer', message: 'Use Uint8Array instead of Buffer.' },
        { name: 'require', message: 'Use ES module imports instead of require.' },
        { name: '__dirname', message: 'Use import.meta.url instead of __dirname.' },
      ],
      'no-restricted-imports': ['error', { patterns: [nodeBuiltins] }],
    },
  },
  {
    files: ['src/core/**', 'src/data/**'],
    rules: {
      'no-restricted-properties': ['error', mathRandom, dateNow],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            'Game logic must not read the clock; use the injected clock instead of new Date().',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            nodeBuiltins,
            {
              group: ['pixi.js'],
              message: 'src/core must stay renderer-free; move rendering to src/game.',
            },
            {
              group: ['i18next*'],
              message: 'src/core returns i18n keys, not texts; translate in the UI layer.',
            },
            {
              group: ['@capacitor/*'],
              message: 'src/core must stay platform-free; use src/platform.',
            },
            {
              group: ['**/ui/**', '**/game/**', '**/platform/**', '**/app/**'],
              message: 'src/core must not depend on outer layers; pass data in instead.',
            },
          ],
        },
      ],
    },
  },
);
