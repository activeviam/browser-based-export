'use strict';

const Ajv = require('ajv');
const escapeQuote = require('js-string-escape');
const puppeteer = require('puppeteer');

const {getRoundedDimensionsInPx} = require('./paper');
const {pdfExportExamplePayload} = require('./examples');
const {pdfExportPayloadSchema} = require('./schemas');

const ajv = new Ajv({useDefaults: true});
const validate = ajv.compile(pdfExportPayloadSchema);

// `asyncActions` is a list of functions that take the Puppeteer `page` as argument
// and return a Promise.
// This function will resolve with the result of the last action in the list.
const inIsolatedSession = asyncActions =>
  // Puppeteer does not provide an API to create different browser contexts yet.
  // See https://github.com/GoogleChrome/puppeteer/issues/85
  // So in order to have tabs running in separate sessions with isolated cookies, local storage, etc.
  // we launch a new instance of Chromium every time.
  puppeteer.launch().then(browser =>
    browser
      .newPage()
      .then(page =>
        asyncActions.reduce(
          (promise, asyncAction) => promise.then(() => asyncAction(page)),
          Promise.resolve()
        )
      )
      .then(
        result => browser.close().then(() => result),
        error =>
          browser.close().then(() => {
            throw error;
          })
      )
  );

const authenticate = (
  url,
  {cookies = [], webStorageItems = []} = {}
) => page => {
  if (cookies.length === 0 && webStorageItems.length === 0) {
    return Promise.resolve();
  }

  const getAddWebStorageItem = ({key, type, value}) =>
    `window.${type}Storage.setItem("${escapeQuote(key)}", "${escapeQuote(
      value
    )}")`;

  return page
    .goto(url)
    .then(() =>
      Promise.all([
        page
          .cookies()
          .then(existingCookies =>
            page
              .deleteCookie(...existingCookies)
              .then(() => page.setCookie(...cookies))
          ),
        page.evaluate(webStorageItems.map(getAddWebStorageItem).join('; ')),
      ])
    );
};

const gotoPageAndWaitUntilNetworkIdle = (
  url,
  {networkIdle} = {},
  timeoutInMilliseconds
) => page =>
  page.goto(
    url,
    networkIdle
      ? {
          timeout: timeoutInMilliseconds,
          waitUntil: [
            // Fired when the page and its dependent resources have finished loading.
            'load',
            // Fired when there has been no pending network requests during 500 milliseconds.
            'networkidle0',
          ],
        }
      : {}
  );

const resize = dimensions => page =>
  page.setViewport(dimensions).then(() =>
    // Ideally, we should not need to change the style of the body tag.
    // It's an issue upstream in Puppeteer.
    // See https://github.com/GoogleChrome/puppeteer/issues/1815
    page.evaluate(`
        const bodyStyle = document.getElementsByTagName('body')[0].style;
        bodyStyle.width = '${dimensions.width}px';
        bodyStyle.height = '${dimensions.height}px';`)
  );

const waitUntilRenderComplete = timeoutInMilliseconds => page =>
  page.waitForFunction(
    // First make sure that the document is ready so that the application
    // has a chance to set the render complete flag to false when it starts.
    //
    // `window.renderComplete !== false` evaluates to `true` if the application
    // does not care about the flag and let it to `undefined`
    // or when it is switched back to `true`.
    //
    "document.readyState === 'complete' && window.renderComplete !== false",
    {timeout: timeoutInMilliseconds}
  );

// Calling this function allows us to wait for the browser to be idle before triggering the export.
// This way, we give it time to finish its rendering and hopefully avoid capturing loading spinners.
const waitForIdleBrowser = page => {
  const waitedForIdleCallbackFlag = 'browserExport_waitedForIdleCallback';

  return page.waitForFunction(
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
  );
};

const generatePdf = dimensions => page =>
  page.pdf(Object.assign({pageRanges: '1', printBackground: true}, dimensions));

const exportPdf = (payload, timeoutInSeconds) => {
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

  return inIsolatedSession([
    authenticate(payload.url, payload.authentication),
    gotoPageAndWaitUntilNetworkIdle(
      payload.url,
      payload.waitUntil,
      timeoutInMilliseconds
    ),
    resize(dimensions),
    waitUntilRenderComplete(timeoutInMilliseconds),
    waitForIdleBrowser,
    generatePdf(dimensions),
  ]);
};

module.exports = {
  exportPdf,
  pdfExportExamplePayload,
  pdfExportPayloadSchema,
};
