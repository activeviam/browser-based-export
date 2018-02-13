'use strict';

module.exports = {
  extends: '../../.eslintrc.js',
  rules: {
    // The lambda code is bundled through Webpack so we don't need this rule.
    'node/no-unpublished-require': 'off',
  },
};
