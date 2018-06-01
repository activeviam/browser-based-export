'use strict';

const Ajv = require('ajv');
const dedent = require('dedent');
const escapeQuote = require('js-string-escape');
const {
  puppeteer: {chromium_revision: chromiumRevision},
} = require('puppeteer/package');

const {getRoundedDimensionsInPx} = require('./paper');
const {pdfExportExamplePayload} = require('./examples');
const {pdfExportPayloadSchema} = require('./schemas');
const {
  executeAsyncAction,
  inBrowser: inAgnosticBrowser,
  namespacedDebug,
  rejectAfterTimeout,
  waitForEvaluationContext,
} = require('./utils');

const ajv = new Ajv({useDefaults: true});
const validate = ajv.compile(pdfExportPayloadSchema);

const gotoPage = ({debug = namespacedDebug('gotoPage'), page, url}) =>
  executeAsyncAction({
    action: () => page.goto(url),
    debug,
    name: 'navigation',
  });

const getInjectWebStorageItem = ({key, type, value}) =>
  `window.${type}Storage.setItem("${escapeQuote(key)}", "${escapeQuote(
    value
  )}")`;

const authenticate = ({
  authentication: {cookies = [], webStorageItems = []} = {},
  page,
  timeoutInMilliseconds,
  url,
}) => {
  const debug = namespacedDebug('authenticate');

  if (cookies.length === 0 && webStorageItems.length === 0) {
    debug('no authentication needed');
    return Promise.resolve();
  }

  const injectCookies = () => {
    const debugCookies = namespacedDebug('authenticate:cookies');

    if (cookies.length === 0) {
      debugCookies('no cookies to inject');
      return Promise.resolve();
    }

    return executeAsyncAction({
      action: async () => {
        const existingCookies = await page.cookies();
        await page.deleteCookie(...existingCookies);
        await page.setCookie(...cookies);
      },
      debug: debugCookies,
      name: 'cookies injection',
    });
  };

  const injectWebStorageItems = () => {
    const debugWebStorage = namespacedDebug('authenticate:web-storage');

    if (webStorageItems.length === 0) {
      debugWebStorage('no Web Storage items to inject');
      return Promise.resolve();
    }

    return executeAsyncAction({
      action: () =>
        page.evaluate(webStorageItems.map(getInjectWebStorageItem).join('; ')),
      debug: debugWebStorage,
      name: 'Web Storage items injection',
    });
  };

  return executeAsyncAction({
    action: async () => {
      await gotoPage({debug, page, url});
      await waitForEvaluationContext({page, timeoutInMilliseconds});
      await Promise.all([injectCookies(), injectWebStorageItems()]);
      // It's important to always reload the page because the application
      // might read the cookies and Web Storage items only once at startup
      // and consider the user to not be authenticated if they are not there at this time.
      // By reloading the page, the added cookies and Web Storage items will
      // be there since startup and the application will thus be able to read them.
      await executeAsyncAction({
        action: () => page.reload(),
        debug,
        name: 'reload',
      });
    },
    debug,
    name: 'authentication',
  });
};

const waitUntilNetworkIdle = ({
  page,
  waitUntil: {networkIdle} = {},
  timeoutInMilliseconds,
}) => {
  const debug = namespacedDebug('waitUntilNetworkIdle');

  if (!networkIdle) {
    debug('no need to wait for idle network');
    return Promise.resolve();
  }

  return executeAsyncAction({
    action: () =>
      page.waitForNavigation({
        timeout: timeoutInMilliseconds,
        waitUntil:
          // Fired when there has been no pending network requests during 500 milliseconds.
          'networkidle0',
      }),
    debug,
    name: 'wait for idle network',
  });
};

const waitUntilReadyStateComplete = ({page, timeoutInMilliseconds}) =>
  executeAsyncAction({
    action: () =>
      page.waitForFunction("document.readyState === 'complete'", {
        timeout: timeoutInMilliseconds,
      }),
    debug: namespacedDebug('waitUntilReadyStateComplete'),
    name: 'wait for complete readyState',
  });

const resize = ({dimensions, page}) => {
  const debug = namespacedDebug('resize');

  return executeAsyncAction({
    action: async () => {
      await executeAsyncAction({
        action: () => page.setViewport(dimensions),
        debug,
        name: 'set viewport',
      });
      // Ideally, we should not need to change the style of the body tag.
      // It's an issue upstream in Puppeteer.
      // See https://github.com/GoogleChrome/puppeteer/issues/1815
      return executeAsyncAction({
        action: () =>
          page.evaluate(dedent`
            const bodyStyle = document.getElementsByTagName('body')[0].style;
            bodyStyle.width = '${dimensions.width}px';
            bodyStyle.height = '${dimensions.height}px';`),
        debug,
        name: 'set body size',
      });
    },
    debug,
    name: 'resize browser page',
  });
};

const waitUntilRenderComplete = ({page, timeoutInMilliseconds}) =>
  executeAsyncAction({
    action: () =>
      page.waitForFunction(
        // `window.renderComplete !== false` evaluates to `true` if the application
        // does not care about the flag and let it to `undefined`
        // or when it is switched back to `true`.
        'window.renderComplete !== false',
        {timeout: timeoutInMilliseconds}
      ),
    debug: namespacedDebug('waitUntilRenderComplete'),
    name: 'wait for complete render',
  });

const waitedForIdleCallbackFlag = 'browserExport_waitedForIdleCallback';

// Calling this function allows us to wait for the browser to be idle before triggering the export.
// This way, we give it time to finish its rendering and hopefully avoid capturing loading spinners.
const waitForIdleBrowser = ({page}) =>
  executeAsyncAction({
    action: () =>
      page.waitForFunction(
        `(() => {
      // Ony attach the callback if it's not already there.
      if (window.${waitedForIdleCallbackFlag} === undefined) {
        // Don't attach the callback again.
        window.${waitedForIdleCallbackFlag} = false;
        // Next time the browser is idle, set the flag to \`true\`.
        window.requestIdleCallback(() => {
          window.${waitedForIdleCallbackFlag} = true;
        });
      }
  
      return window.${waitedForIdleCallbackFlag};
    })()`
      ),
    debug: namespacedDebug('waitForIdleBrowser'),
    name: 'wait for idle browser',
  });

const generatePdf = ({dimensions, page}) =>
  executeAsyncAction({
    action: () =>
      page.pdf(
        Object.assign({pageRanges: '1', printBackground: true}, dimensions)
      ),
    debug: namespacedDebug('generatePdf'),
    name: 'PDF generation',
  });

const exportPdf = ({inIncognitoContext, payload, timeoutInSeconds}) => {
  if (!validate(payload)) {
    throw new Error(JSON.stringify(validate.errors, null, 2));
  }

  if (typeof timeoutInSeconds !== 'number' || timeoutInSeconds <= 0) {
    throw new Error(
      `The timeout should be a strictly positive amount of seconds but ${timeoutInSeconds} was given.`
    );
  }

  const dimensions = getRoundedDimensionsInPx(payload.paper);
  const timeoutInMilliseconds = 1000 * timeoutInSeconds;

  return executeAsyncAction({
    action: () =>
      rejectAfterTimeout({
        errorMessage: `Failed to perform the export under the given timeout of ${timeoutInSeconds} seconds.`,
        promise: inIncognitoContext(async page => {
          await authenticate({
            authentication: payload.authentication,
            page,
            timeoutInMilliseconds,
            url: payload.url,
          });
          await Promise.all([
            gotoPage({page, url: payload.url}),
            (async () => {
              await waitForEvaluationContext({
                page,
                timeoutInMilliseconds,
              });
              await waitUntilReadyStateComplete({page, timeoutInMilliseconds});
              await Promise.all([
                resize({dimensions, page}),
                waitUntilRenderComplete({page, timeoutInMilliseconds}),
              ]);
            })(),
            waitUntilNetworkIdle({
              page,
              timeoutInMilliseconds,
              waitUntil: payload.waitUntil,
            }),
          ]);
          await waitForIdleBrowser({page});
          return generatePdf({dimensions, page});
        }),
        timeoutInMilliseconds,
      }),
    debug: namespacedDebug('exportPdf'),
    name: 'PDF export',
  });
};

const inBrowser = ({
  // Set to `true` in browser-based-pdf-export-lambda.
  // See https://github.com/GoogleChrome/puppeteer/issues/2608
  _dontUseIncognitoContext = false,
  action,
  puppeteerOptions,
}) =>
  inAgnosticBrowser({
    _dontUseIncognitoContext,
    action: inIncognitoContext =>
      action({
        exportPdf: ({payload, timeoutInSeconds}) =>
          exportPdf({
            inIncognitoContext,
            payload,
            timeoutInSeconds,
          }),
      }),
    puppeteerOptions,
  });

module.exports = {
  chromiumRevision,
  inBrowser,
  pdfExportExamplePayload,
  pdfExportPayloadSchema,
};
