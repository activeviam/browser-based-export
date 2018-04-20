'use strict';

const path = require('path');

const packageRootDirectory = path.dirname(require.resolve('./package'));

const dist = path.join(packageRootDirectory, 'dist');
const entry = require.resolve('./src/start');

module.exports = {
  dist,
  entry,
};
