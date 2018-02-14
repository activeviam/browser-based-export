/* eslint-disable no-console */
'use strict';

const path = require('path');

const fs = require('fs-extra');
const archiver = require('archiver');

const {directories: {lib: outputDirectory}} = require('../package');
const packageDirectoryPath = path.dirname(require.resolve('../package'));

const outputDirectoryPath = path.join(packageDirectoryPath, outputDirectory);
const zipPath = path.join(packageDirectoryPath, 'dist.zip');

const archive = archiver('zip', {
  zlib: {level: 9},
});

archive.on('error', () => {
  throw new Error('.zip file creation failed.');
});

// We can disable this rule safely as we know the path is safe.
// eslint-disable-next-line security/detect-non-literal-fs-filename
archive.pipe(fs.createWriteStream(zipPath));

archive.directory(outputDirectoryPath, false);

archive.finalize();
