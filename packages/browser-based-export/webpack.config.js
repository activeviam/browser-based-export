'use strict';

const puppeteer = require('puppeteer');
// The only reason why we bundle this lib two and not let all the work to
// browser-based-export-server and browser-based-pdf-export-lambda is because
// Puppeteer needs a special treatement to be bundled correctly.
// See the next comment about the StringReplacePlugin for the technical explanation.
// By bundling the lib, we make the webpack configs of browser-based-export-server and browser-based-pdf-export-lambda simpler.
const StringReplacePlugin = require('string-replace-webpack-plugin');
const webpack = require('webpack');

const paths = require('./paths');

module.exports = {
  devtool: 'source-map',
  entry: paths.entry,
  mode: 'development',
  module: {
    rules: [
      // We need to redefine the `PROJECT_ROOT` constant because its value is computed dynamically in
      // puppeteer/node6/lib/Downloader.js and thus Webpack cannot resolve some import paths statically.
      // See https://github.com/GoogleChrome/puppeteer/issues/1644.
      // We cannot use something like `patch-package` here because it doesn't work well in yarn workspaces.
      {
        test: /puppeteer\/node6\/lib\/Downloader\.js$/,
        use: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /path.join\(PROJECT_ROOT, 'package.json'\)/g,
              replacement: () => "'../../package.json'",
            },
          ],
        }),
      },
      {
        // mkdirp is a transitive dependency of puppeteer.
        test: /mkdirp\/index\.js$/,
        use: StringReplacePlugin.replace({
          replacements: [
            // See https://github.com/babel/babel/issues/2569
            {
              pattern: /0777/g,
              replacement: () => '0o777',
            },
          ],
        }),
      },
    ],
  },
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    path: paths.dist,
  },
  plugins: [
    new StringReplacePlugin(),
    new webpack.DefinePlugin({
      DEV_ONLY_CHROMIUM_EXECUTABLE_PATH_DEFINED_BY_WEBPACK: JSON.stringify(
        puppeteer.executablePath()
      ),
    }),
  ],
  target: 'node',
};
