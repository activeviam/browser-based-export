'use strict';

const path = require('path');

const {main} = require('./package');
const packageRootDirectory = path.dirname(require.resolve('./package'));

const dist = path.join(packageRootDirectory, main);
const entry = require.resolve('./src/export');

module.exports = {
  dist,
  entry,
};
