/* eslint-disable no-console */
'use strict';

const assert = require('assert');
const path = require('path');

const fs = require('fs-extra');
const fetch = require('node-fetch');
const decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');

const {chromiumRevision} = require('browser-based-export');

const {
  directories: {lib: outputDirectory},
} = require('../package');
const packageDirectoryPath = path.dirname(require.resolve('../package'));

const outputDirectoryPath = path.join(packageDirectoryPath, outputDirectory);

assert.equal(
  chromiumRevision,
  '557152',
  'The Chromium revision used by default by Puppeteer has changed. Please update the .zip URL below accordingly.'
);

const zipUrl =
  'https://github.com/adieuadieu/serverless-chrome/releases/download/v1.0.0-44/dev-headless-chromium-amazonlinux-2017-03.zip';

const download = async () => {
  const alreadyDownloaded = await fs.pathExists(
    path.join(outputDirectoryPath, 'headless-chromium')
  );
  if (alreadyDownloaded) {
    console.log('Headless Chromium has already been download.');
  } else {
    console.log('Downloading Headless Chromium...');
    const response = await fetch(zipUrl);
    const buffer = await response.buffer();
    await decompress(buffer, outputDirectoryPath, {
      plugins: [decompressUnzip()],
    });
    console.log('Headless Chromium downloaded successfully.');
  }
};

download();
