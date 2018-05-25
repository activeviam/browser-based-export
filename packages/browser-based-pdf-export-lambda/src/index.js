/* eslint-disable no-console */
'use strict';

const path = require('path');

const config = require('./config');
const handle = require('./handle');

exports.handler = (event, context, callback) => {
  // See https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html#nodejs-prog-model-context-properties
  context.callbackWaitsForEmptyEventLoop = false;
  handle({
    callback,
    config,
    event,
    headlessChromiumPath: path.resolve('.', 'headless-chromium'),
    log: console.log.bind(console),
    // Read the timeout from the AWS Lambda function configuration.
    timeoutInSeconds: Math.ceil(context.getRemainingTimeInMillis() / 1000),
  });
};
