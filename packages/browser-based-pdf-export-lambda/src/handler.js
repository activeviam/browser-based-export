/* eslint-disable no-console */
'use strict';

const path = require('path');

const paths = require('../paths');

const config = require('./config');
const handle = require('./handle');

exports.handler = (event, context, callback) => {
  // See https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html#nodejs-prog-model-context-properties
  context.callbackWaitsForEmptyEventLoop = false;
  handle({
    callback,
    config,
    event,
    log: console.log.bind(console),
    puppeteerOptions: {
      args: ['--no-sandbox', '--single-process'],
      executablePath: path.resolve('.', paths.headlessChromiumFilename),
    },
    // Read the timeout from the AWS Lambda function configuration.
    timeoutInSeconds: Math.ceil(context.getRemainingTimeInMillis() / 1000),
  });
};
