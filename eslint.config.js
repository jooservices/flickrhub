const js = require('@eslint/js');
const nodePlugin = require('eslint-plugin-node');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    plugins: {
      node: nodePlugin,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-require': 'off',
    },
  },
  prettier,
];
