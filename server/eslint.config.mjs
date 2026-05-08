import eslint from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort'

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'simple-import-sort/imports': ['error', {
        groups: [
          ['^node:'],
          ['^@?\\w'],
          ['^fractapay-shared'],
          ['^\\.'],
        ],
      }],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
