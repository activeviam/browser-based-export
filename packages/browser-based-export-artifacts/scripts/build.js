'use strict';

const path = require('path');

const fs = require('fs-extra');
const archiver = require('archiver');

const distDirectoryName = 'dist';
const readmeFilename = 'README.md';

const currentPackageRootDirectory = path.dirname(require.resolve('../package'));
const distPath = path.join(currentPackageRootDirectory, distDirectoryName);

const zipDirectory = ({inputDirectory, zipPath}) =>
  new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: {level: 9},
    });

    archive.on('close', resolve);
    archive.on('error', reject);

    // We can disable this rule safely as we know the path is safe.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    archive.pipe(fs.createWriteStream(zipPath));

    archive.directory(inputDirectory, false);

    archive.finalize();
  });

const buildPackageArtifact = packageName => {
  const fullPackageName = `@activeviam/${packageName}`;
  const packageRootDirectory = path.dirname(
    require.resolve(`${fullPackageName}/package`)
  );
  const packageDistDirectory = path.join(
    packageRootDirectory,
    distDirectoryName
  );

  return fs
    .copy(
      path.join(packageRootDirectory, readmeFilename),
      path.join(packageDistDirectory, readmeFilename)
    )
    .then(() =>
      zipDirectory({
        inputDirectory: packageDistDirectory,
        zipPath: path.join(distPath, `${packageName}.zip`),
      })
    );
};

fs
  .ensureDir(distPath)
  .then(() =>
    Promise.all(
      ['browser-based-export-server', 'browser-based-pdf-export-lambda'].map(
        buildPackageArtifact
      )
    )
  );
