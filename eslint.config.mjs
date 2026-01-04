import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  {
    plugins: {
      import: importPlugin
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'jsx-quotes': ['error', 'prefer-double'],
      'import/extensions': [
        'warn',
        {
          js: 'never',
          jsx: 'never',
          json: 'never',
          css: 'always',
          server: 'always',
          client: 'always'
        }
      ],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'object', 'type', 'index'],
          pathGroups: [
            // Put CSS last, safely
            { pattern: './**/*.css', group: 'index', position: 'after' },
            { pattern: '@/**/**.css', group: 'index', position: 'after' }
          ],
          // exclude these so pathGroups can control placement
          pathGroupsExcludedImportTypes: ['builtin', 'external', 'internal', 'type', 'react'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          warnOnUnassignedImports: true
        }
      ],
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto'
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts'
  ])
]);

export default eslintConfig;
