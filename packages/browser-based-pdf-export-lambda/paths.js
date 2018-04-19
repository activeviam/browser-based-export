'use strict';

const path = require('path');

const packageRootDirectory = path.dirname(require.resolve('./package'));

const dist = path.join(packageRootDirectory, 'dist');
const entry = require.resolve('./src/handler');

module.exports = {
  dist,
  entry,
  headlessChromiumFilename: 'headless-chromium',
};
