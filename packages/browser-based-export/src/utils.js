'use strict';

const path = require('path');

const globalDebug = require('debug');
const pTimeout = require('p-timeout');
const promiseRetry = require('promise-retry');
const Puppeteer = require('puppeteer/lib/Puppeteer');
const {
  puppeteer: {chromium_revision: chromiumRevision},
} = require('puppeteer/package');

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
  const consoleDebug = namespacedDebug('browser-console');

  const page = await executeAsyncAction({
    action: pageCreator.newPage.bind(pageCreator),
    debug,
    name: 'creating new page',
  });

  page.on('console', log => {
    consoleDebug(log.text());
  });

  try {
    return await executeAsyncAction({
      action: () => action(page),
      debug,
      name: 'executing action',
    });
  } finally {
    await executeAsyncAction({
      action: page.close.bind(page),
      debug,
      name: 'closing page',
    });
  }
};

const inIncognitoContext = async ({action, browser}) => {
  const debug = namespacedDebug('inIncognitoContext');

  const context = await executeAsyncAction({
    action: browser.createIncognitoBrowserContext.bind(browser),
    debug,
    name: 'creating incognito context',
  });

  try {
    return await inPage({action, pageCreator: context});
  } finally {
    await executeAsyncAction({
      action: context.close.bind(context),
      debug,
      name: 'closing context',
    });
  }
};

const inBrowser = async ({
  _dontUseIncognitoContext,
  action,
  puppeteerOptions,
}) => {
  const debug = namespacedDebug('inBrowser');

  const browser = await executeAsyncAction({
    action: () => {
      const puppeteerRoot = path.dirname(
        require.resolve('puppeteer/package.json')
      );
      const isPuppeteerCore = false;
      const puppeteer = new Puppeteer(
        puppeteerRoot,
        chromiumRevision,
        isPuppeteerCore
      );
      return puppeteer.launch(puppeteerOptions);
    },
    debug,
    name: 'launching browser',
  });

  try {
    return await executeAsyncAction({
      action: () =>
        action(
          innerAction =>
            _dontUseIncognitoContext
              ? inPage({action: innerAction, pageCreator: browser})
              : inIncognitoContext({action: innerAction, browser})
        ),
      debug,
      name: 'executing action',
    });
  } finally {
    await executeAsyncAction({
      action: browser.close.bind(browser),
      debug,
      name: 'closing browser',
    });
  }
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
  chromiumRevision,
  executeAsyncAction,
  inBrowser,
  namespacedDebug,
  rejectAfterTimeout,
  waitForEvaluationContext,
};
