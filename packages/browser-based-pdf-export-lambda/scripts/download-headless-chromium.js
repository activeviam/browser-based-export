/* eslint-disable no-console */
'use strict';

const path = require('path');

const fs = require('fs-extra');
const fetch = require('node-fetch');
const decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');

const paths = require('../paths');

const zipUrl =
  'https://github.com/adieuadieu/serverless-chrome/releases/download/v1.0.0-36/stable-headless-chromium-amazonlinux-2017-03.zip';

fs
  .pathExists(path.join(paths.dist, paths.headlessChromiumFilename))
  .then(alreadyDownloaded => {
    if (alreadyDownloaded) {
      console.log('Headless Chromium has already been download.');
    } else {
      console.log('Downloading Headless Chromium...');
      fetch(zipUrl)
        .then(response => response.buffer())
        .then(buffer =>
          decompress(buffer, paths.dist, {
            plugins: [decompressUnzip()],
          })
        )
        .then(() => {
          console.log('Headless Chromium downloaded successfully.');
        });
    }
  });
