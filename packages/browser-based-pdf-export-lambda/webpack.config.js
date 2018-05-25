'use strict';

const path = require('path');

const StringReplacePlugin = require('string-replace-webpack-plugin');
const webpack = require('webpack');

const {
  directories: {lib: outputDirectory},
} = require('./package');
const packageDirectory = path.dirname(require.resolve('./package'));

module.exports = {
  entry: require.resolve('./src'),
  // We don't want the code to be minified so we use the `development` mode.
  // However, we will use a plugin below to set `process.env.NODE_ENV` to `production`.
  mode: 'development',
  module: {
    rules: [
      // Replace dynamically computed path in puppeteer/lib/Launcher.js
      // by a string literal understandable by Webpack.
      // See https://github.com/GoogleChrome/puppeteer/issues/1644.
      {
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /path.join\(helper.projectRoot\(\), 'package.json'\)/g,
              replacement: () => "'../package.json'",
            },
          ],
        }),
        test: /puppeteer\/lib\/Launcher.js$/,
      },
    ],
  },
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    path: path.join(packageDirectory, outputDirectory),
  },
  plugins: [
    new StringReplacePlugin(),
    // See comment above about our choice of `mode`.
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
  target: 'node',
};
