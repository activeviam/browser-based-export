'use strict';

module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:all',
    'plugin:node/recommended',
    'prettier',
    'plugin:security/recommended',
    'plugin:unicorn/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'script',
  },
  plugins: ['node', 'security', 'unicorn'],
  root: true,
  rules: {
    'capitalized-comments': 'off',
    eqeqeq: ['error', 'smart'],
    'line-comment-position': 'off',
    'linebreak-style': 'off',
    'max-statements': ['error', {max: 15}],
    'multiline-comment-style': 'off',
    'no-inline-comments': 'off',
    'no-magic-numbers': 'off',
    'no-ternary': 'off',
    'no-undefined': 'off',
    'no-warning-comments': 'off',
    'one-var': 'off',
    // We can disable the following rule as the use of schemas
    // protects us from unexpected values.
    'security/detect-object-injection': 'off',
    'sort-keys': ['error', 'asc', {caseSensitive: false, natural: true}],
  },
};
