import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'evidence/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      curly: 'error',
      'prefer-const': 'error',
      'no-shadow': 'error',
      'no-nested-ternary': 'error'
    }
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { ...js.configs.recommended.rules }
  }
];
