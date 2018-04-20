'use strict';

const {
  devOnlyChromiumExecutablePath,
  recommendedChromiumRevision,
} = require('@activeviam/browser-based-export');
const envalid = require('envalid');

const omitDevOnlyChromiumExecutablePath =
  // eslint-disable-next-line no-undef
  typeof OMIT_DEV_ONLY_CHROMIUM_EXECUTABLE_PATH_DEFINED_BY_BABEL !==
  'undefined';

const env = envalid.cleanEnv(
  // eslint-disable-next-line no-process-env
  process.env,
  {
    CHROMIUM_EXECUTABLE_PATH: envalid.str(
      Object.assign(
        {
          desc: `The path to the Chromium executable to launch to perform the export. The recommended revision is ${recommendedChromiumRevision}.`,
        },
        omitDevOnlyChromiumExecutablePath
          ? {}
          : {devDefault: devOnlyChromiumExecutablePath}
      )
    ),
    COLOR: envalid.bool({
      default: false,
      desc: 'If true, the log output will be colorized.',
      devDefault: true,
    }),
    LOG_LEVEL: envalid.str({
      choices: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
      default: 'info',
      devDefault: 'verbose',
      docs: 'https://github.com/winstonjs/winston/tree/2.4.0#logging-levels',
    }),
    PDF_EXPORT_AUTHORIZED_URL_PATTERN: envalid.str({
      desc:
        'The regular expression pattern that the URL to export has to match to be authorized.',
      devDefault: '.', // Authorize any URL in development
    }),
    PDF_EXPORT_TIMEOUT_IN_SECONDS: envalid.num({
      desc:
        'The maximum amount of seconds that the export is allowed to take before being aborted.',
      devDefault: 30,
    }),
    PORT: envalid.port({
      desc: 'The port on which the server will listen.',
      devDefault: 5000,
    }),
  },
  {strict: true}
);

const config = {
  log: {
    colorize: env.COLOR,
    level: env.LOG_LEVEL,
  },
  port: env.PORT,
  routes: {
    pdfExport: {
      // We can safely disable the next warning as this is a variable
      // coming from the server environment and not a user input.
      // eslint-disable-next-line security/detect-non-literal-regexp
      authorizedUrlRegex: new RegExp(env.PDF_EXPORT_AUTHORIZED_URL_PATTERN),
      chromiumExecutablePath: env.CHROMIUM_EXECUTABLE_PATH,
      timeoutInSeconds: env.PDF_EXPORT_TIMEOUT_IN_SECONDS,
    },
  },
};

module.exports = config;
