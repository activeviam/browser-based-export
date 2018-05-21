'use strict';

const path = require('path');

const StringReplacePlugin = require('string-replace-webpack-plugin');

const {
  directories: {lib: outputDirectory},
  main: entryFilename,
} = require('./package');
const packageDirectory = path.dirname(require.resolve('./package'));

module.exports = {
  entry: path.join(packageDirectory, entryFilename),
  module: {
    loaders: [
      // We need to redefine the `PROJECT_ROOT` constant because its value is computed dynamically in
      // puppeteer/lib/Downloader.js and thus Webpack cannot resolve some import paths statically.
      // See https://github.com/GoogleChrome/puppeteer/issues/1644.
      {
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /path.join\(PROJECT_ROOT, 'package.json'\)/g,
              replacement: () => "'../../package.json'",
            },
          ],
        }),
        test: /puppeteer\/node6\/lib\/Downloader.js$/,
      },
    ],
  },
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    path: path.join(packageDirectory, outputDirectory),
  },
  plugins: [new StringReplacePlugin()],
  target: 'node',
};
