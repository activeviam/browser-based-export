/* eslint-disable no-console */
'use strict';

const path = require('path');

const fs = require('fs-extra');
const fetch = require('node-fetch');
const decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');

const {directories: {lib: outputDirectory}} = require('../package');
const packageDirectoryPath = path.dirname(require.resolve('../package'));

const outputDirectoryPath = path.join(packageDirectoryPath, outputDirectory);

const zipUrl =
  'https://github.com/adieuadieu/serverless-chrome/releases/download/v1.0.0-36/stable-headless-chromium-amazonlinux-2017-03.zip';

fs
  .pathExists(path.join(outputDirectoryPath, 'headless-chromium'))
  .then(alreadyDownloaded => {
    if (alreadyDownloaded) {
      console.log('Headless Chromium has already been download.');
    } else {
      console.log('Downloading Headless Chromium...');
      fetch(zipUrl)
        .then(response => response.buffer())
        .then(buffer =>
          decompress(buffer, outputDirectoryPath, {
            plugins: [decompressUnzip()],
          })
        )
        .then(() => {
          console.log('Headless Chromium downloaded successfully.');
        });
    }
  });
