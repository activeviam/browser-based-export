'use strict';

const globalDebug = require('debug');
const pFinally = require('p-finally');
const promiseRetry = require('promise-retry');
const puppeteer = require('puppeteer/lib/Puppeteer');

const {name: packageName} = require('../package');

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

const inIncognitoContext = ({action, browser}) => {
  const debug = namespacedDebug('inIncognitoContext');

  return executeAsyncAction({
    action: () => browser.createIncognitoBrowserContext(),
    debug,
    name: 'creating incognito context',
  }).then(context =>
    executeAsyncAction({
      action: () => context.newPage(),
      debug,
      name: 'creating new page',
    }).then(page =>
      pFinally(
        executeAsyncAction({
          action: () => action(page),
          debug,
          name: 'executing action',
        }),
        () =>
          executeAsyncAction({
            action: () => context.close(),
            debug,
            name: 'closing context',
          })
      )
    )
  );
};

const inBrowser = ({action, puppeteerOptions}) => {
  const debug = namespacedDebug('inBrowser');

  return executeAsyncAction({
    action: () => puppeteer.launch(puppeteerOptions),
    debug,
    name: 'launching browser',
  }).then(browser =>
    pFinally(
      executeAsyncAction({
        action: () =>
          action(innerAction =>
            inIncognitoContext({action: innerAction, browser})
          ),
        debug,
        name: 'executing action',
      }),
      () =>
        executeAsyncAction({
          action: () => browser.close(),
          debug,
          name: 'closing browser',
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
  inBrowser,
  namespacedDebug,
  rejectAfterTimeout,
  waitForEvaluationContext,
};
