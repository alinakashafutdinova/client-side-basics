import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'preview_*.png'] },
  {
    files: ['js/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: {
      ...js.configs.recommended.rules,
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-alert': 'error',
      'no-unused-vars': 'error'
    }
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  }
];
