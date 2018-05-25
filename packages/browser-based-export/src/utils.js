'use strict';

const globalDebug = require('debug');
const pFinally = require('p-finally');
const pTimeout = require('p-timeout');
const promiseRetry = require('promise-retry');
const puppeteer = require('puppeteer/lib/Puppeteer');

const {name: packageName} = require('../package');

const namespacedDebug = action => globalDebug(`${packageName}:${action}`);

const executeAsyncAction = async ({action, debug, name}) => {
  debug(`[${name}] started`);
  try {
    const result = await action();
    debug(`[${name}] finished`);
    return result;
  } catch (error) {
    debug(`[${name}] failed`);
    throw error;
  }
};

const inPage = async ({action, pageCreator}) => {
  const debug = namespacedDebug('inPage');

  const page = await executeAsyncAction({
    action: pageCreator.newPage.bind(pageCreator),
    debug,
    name: 'creating new page',
  });

  return pFinally(
    executeAsyncAction({
      action: () => action(page),
      debug,
      name: 'executing action',
    }),
    () =>
      executeAsyncAction({
        action: page.close.bind(page),
        debug,
        name: 'closing page',
      })
  );
};

const inIncognitoContext = async ({action, browser}) => {
  const debug = namespacedDebug('inIncognitoContext');

  const context = await executeAsyncAction({
    action: browser.createIncognitoBrowserContext.bind(browser),
    debug,
    name: 'creating incognito context',
  });

  return pFinally(inPage({action, pageCreator: context}), () =>
    executeAsyncAction({
      action: context.close.bind(context),
      debug,
      name: 'closing context',
    })
  );
};

const inBrowser = async ({
  _dontUseIncognitoContext,
  action,
  puppeteerOptions,
}) => {
  const debug = namespacedDebug('inBrowser');

  const browser = await executeAsyncAction({
    action: () => puppeteer.launch(puppeteerOptions),
    debug,
    name: 'launching browser',
  });

  return pFinally(
    executeAsyncAction({
      action: () =>
        action(
          innerAction =>
            _dontUseIncognitoContext
              ? inPage({action: innerAction, pageCreator: browser})
              : inIncognitoContext({action: innerAction, browser})
        ),
      debug,
      name: 'executing action',
    }),
    () =>
      executeAsyncAction({
        action: browser.close.bind(browser),
        debug,
        name: 'closing browser',
      })
  );
};

const rejectAfterTimeout = ({errorMessage, promise, timeoutInMilliseconds}) =>
  pTimeout(promise, timeoutInMilliseconds, () => {
    namespacedDebug('rejectAfterTimeout')(errorMessage);
    throw new Error(errorMessage);
  });

// TODO: When https://github.com/GoogleChrome/puppeteer/issues/1325 is fixed:
// - remove this function
// - remove the "promise-retry" dependency
// - review the timeouts used in tests and try to decrease them
const waitForEvaluationContext = ({page, timeoutInMilliseconds}) => {
  const debug = namespacedDebug('waitForEvaluationContext');

  return executeAsyncAction({
    action: () =>
      rejectAfterTimeout({
        errorMessage: `Failed to wait for evaluation context under the given timeout of ${timeoutInMilliseconds} milliseconds.`,
        promise: promiseRetry(
          async (retry, number) => {
            debug(`attempt #${number}`);

            try {
              await page.evaluate('1 + 1', {
                timeout: timeoutInMilliseconds,
              });
              debug(`attempt successful`);
              return Promise.resolve();
            } catch (error) {
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
          },
          {minTimeout: 10}
        ),
        timeoutInMilliseconds,
      }),
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
