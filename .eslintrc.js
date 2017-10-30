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
  ],
  parserOptions: {
    ecmaVersion: 2017,
  },
  plugins: ['node', 'security'],
  root: true,
  rules: {
    'capitalized-comments': 'off',
    eqeqeq: ['error', 'smart'],
    'init-declarations': 'off',
    'line-comment-position': 'off',
    'linebreak-style': 'off',
    'multiline-comment-style': 'off',
    'no-empty-function': 'off',
    'no-eq-null': 'off',
    'no-inline-comments': 'off',
    'no-magic-numbers': 'off',
    'no-prototype-builtins': 'off',
    'no-ternary': 'off',
    'no-undefined': 'off',
    'no-underscore-dangle': 'off',
    'one-var': 'off',
    // We can disable the following rule as the use of schemas
    // protects us from unexpected values.
    'security/detect-object-injection': 'off',
    'sort-keys': ['error', 'asc', {caseSensitive: false, natural: true}],
  },
};
