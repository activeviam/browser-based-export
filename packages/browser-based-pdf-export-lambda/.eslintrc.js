'use strict';

module.exports = {
  extends: '../../.eslintrc.js',
  rules: {
    // The AWS Lambda function code is bundled through Webpack so we don't need this rule.
    'node/no-unpublished-require': 'off',
  },
};
