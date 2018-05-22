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
      action: () =>
        page
          .cookies()
          .then(existingCookies =>
            page
              .deleteCookie(...existingCookies)
              .then(() => page.setCookie(...cookies))
          ),
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
    action: () =>
      executeAsyncAction({
        action: () => page.goto(url),
        debug,
        name: 'navigation',
      })
        .then(() => waitForEvaluationContext({page, timeoutInMilliseconds}))
        .then(() => Promise.all([injectCookies(), injectWebStorageItems()])),
    debug,
    name: 'authentication',
  });
};

const gotoPage = ({page, url}) =>
  executeAsyncAction({
    action: () => page.goto(url),
    debug: namespacedDebug('gotoPage'),
    name: 'navigation',
  });

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
    action: () =>
      executeAsyncAction({
        action: () => page.setViewport(dimensions),
        debug,
        name: 'set viewport',
      }).then(() =>
        // Ideally, we should not need to change the style of the body tag.
        // It's an issue upstream in Puppeteer.
        // See https://github.com/GoogleChrome/puppeteer/issues/1815
        executeAsyncAction({
          action: () =>
            page.evaluate(dedent`
              const bodyStyle = document.getElementsByTagName('body')[0].style;
              bodyStyle.width = '${dimensions.width}px';
              bodyStyle.height = '${dimensions.height}px';`),
          debug,
          name: 'set body size',
        })
      ),
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
        promise: inIncognitoContext(page =>
          authenticate({
            authentication: payload.authentication,
            page,
            timeoutInMilliseconds,
            url: payload.url,
          })
            .then(() =>
              Promise.all([
                gotoPage({page, url: payload.url}),
                waitForEvaluationContext({
                  page,
                  timeoutInMilliseconds,
                })
                  .then(() =>
                    waitUntilReadyStateComplete({page, timeoutInMilliseconds})
                  )
                  .then(() =>
                    Promise.all([
                      resize({dimensions, page}),
                      waitUntilRenderComplete({page, timeoutInMilliseconds}),
                    ])
                  ),
                waitUntilNetworkIdle({
                  page,
                  timeoutInMilliseconds,
                  waitUntil: payload.waitUntil,
                }),
              ])
            )
            .then(() => waitForIdleBrowser({page}))
            .then(() => generatePdf({dimensions, page}))
        ),
        timeoutInMilliseconds,
      }),
    debug: namespacedDebug('exportPdf'),
    name: 'PDF export',
  });
};

const inBrowser = ({action, puppeteerOptions}) =>
  inAgnosticBrowser({
    action: inIncognitoContext =>
      Promise.resolve().then(() =>
        action({
          exportPdf: ({payload, timeoutInSeconds}) =>
            exportPdf({inIncognitoContext, payload, timeoutInSeconds}),
        })
      ),
    puppeteerOptions,
  });

module.exports = {
  chromiumRevision,
  inBrowser,
  pdfExportExamplePayload,
  pdfExportPayloadSchema,
};