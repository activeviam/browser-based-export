'use strict';

const paths = require('./paths');

module.exports = {
  entry: paths.entry,
  mode: 'development',
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    path: paths.distContent,
  },
  target: 'node',
};
