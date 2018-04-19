'use strict';

const webpack = require('webpack');

const {name: fullPackageName} = require('./package');
const paths = require('./paths');

module.exports = {
  entry: paths.entry,
  mode: 'development',
  output: {
    filename: `${fullPackageName.split('/')[1]}.js`,
    libraryTarget: 'commonjs2',
    path: paths.dist,
  },
  plugins: [
    new webpack.DefinePlugin({
      // When delivering the server as a single Node.js file,
      // we let the developer take care of installing Chromium and giving us a path to its executable.
      // The goals are:
      //  - to not require an Internet connection;
      //  - to let the developer use a custom build of Chromium.
      OMIT_DEV_ONLY_CHROMIUM_EXECUTABLE_PATH_DEFINED_BY_BABEL: true,
    }),
  ],
  target: 'node',
};
