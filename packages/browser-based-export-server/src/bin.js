#!/usr/bin/env node
'use strict';

const {mapValues, omit} = require('lodash/fp');
const yargs = require('yargs');

const {environmentVariables, getConfig} = require('./config');
const {withServer} = require('./server');

// eslint-disable-next-line no-unused-expressions
yargs
  .command({
    command: 'config',
    describe: 'List the available environment variables.',
    handler() {
      // eslint-disable-next-line no-console
      console.dir(mapValues(omit('_parse'), environmentVariables), {
        colors: true,
      });
    },
  })
  .command({
    command: 'start',
    describe: [
      'Start the server, reading the configuration from environment variables.',
      'The `GET /` route will list all the availabe routes.',
      '',
      'Troubleshooting:',
      "This package's main dependency `@activeviam/browser-based-export` is using the https://www.npmjs.com/package/debug utility.",
      'Set the `DEBUG` environment variable to `@activeviam/browser-based-export:*` to see the debug messages',
      "If that's not enough, you can follow https://github.com/GoogleChrome/puppeteer/tree/v1.4.0#debugging-tips",
    ].join('\n'),
    handler() {
      withServer({config: getConfig()});
    },
  })
  .demandCommand(1)
  .help()
  .wrap(yargs.terminalWidth()).argv;
