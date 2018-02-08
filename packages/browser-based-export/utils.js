'use strict';

const globalDebug = require('debug');
const promiseRetry = require('promise-retry');
const puppeteer = require('puppeteer/node6/lib/Puppeteer');

const {name: packageName} = require('./package');

const namespacedDebug = action => globalDebug(`${packageName}:${action}`);

const executeAsyncAction = ({action, debug, name}) =>
  Promise.resolve()
    .then(() => {
      debug(`[${name}] started`);
    })
    .then(action)
    .then(
      result => {
        debug(`[${name}] finished`);
        return result;
      },
      error => {
        debug(`[${name}] failed`);
        throw error;
      }
    );

const inIsolatedSession = ({action, puppeteerOptions}) => {
  const debug = namespacedDebug('inIsolatedSession');

  const close = browser =>
    executeAsyncAction({
      action: browser.close.bind(browser),
      debug,
      name: 'closing browser',
    });

  // Puppeteer does not provide an API to create different browser contexts yet.
  // See https://github.com/GoogleChrome/puppeteer/issues/85
  // So in order to have tabs running in separate sessions with isolated cookies, local storage, etc.
  // we launch a new instance of Chromium every time.
  return executeAsyncAction({
    action: () => puppeteer.launch(puppeteerOptions),
    debug,
    name: 'isolated session creation',
  }).then(browser =>
    browser
      .newPage()
      .then(page => action(page))
      .then(
        result => close(browser).then(() => result),
        error =>
          close(browser).then(() => {
            throw error;
          })
      )
  );
};

const rejectAfterTimeout = ({errorMessage, promise, timeoutInMilliseconds}) =>
  Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutInMilliseconds);
    }),
  ]);

// TODO: When https://github.com/GoogleChrome/puppeteer/issues/1325 is fixed:
// - remove this function
// - remove the "promise-retry" dependency
// - review the timeouts used in tests and try to decrease them
const waitForEvaluationContext = ({page, timeoutInMilliseconds}) => {
  const debug = namespacedDebug('waitForEvaluationContext');

  return executeAsyncAction({
    action: () =>
      rejectAfterTimeout(
        {
          errorMessage: `Failed to wait for evaluation context under the given timeout of ${timeoutInMilliseconds} milliseconds.`,
          promise: promiseRetry((retry, number) => {
            debug(`attempt #${number}`);

            return page
              .evaluate('1 + 1', {
                timeout: timeoutInMilliseconds,
              })
              .then(
                () => {
                  debug(`attempt successful`);
                },
                error => {
                  if (
                    error.message.includes(
                      'Cannot find context with specified id undefined'
                    )
                  ) {
                    debug('missing context, retrying');
                    return retry(error);
                  }

                  debug('received non-context related error, rethrowing');
                  throw error;
                }
              );
          }),
          timeoutInMilliseconds,
        },
        {minTimeout: 50}
      ),
    debug,
    name: 'wait for evaluation context',
  });
};

module.exports = {
  executeAsyncAction,
  inIsolatedSession,
  namespacedDebug,
  rejectAfterTimeout,
  waitForEvaluationContext,
};
