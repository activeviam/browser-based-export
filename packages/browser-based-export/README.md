[![npm version](https://img.shields.io/npm/v/browser-based-export.svg)](https://npmjs.org/package/browser-based-export)
[![build status](https://img.shields.io/circleci/project/github/activeviam/browser-based-export.svg)](https://circleci.com/gh/activeviam/browser-based-export)

# Goal

`browser-based-export` is a wrapper on top of [Puppeteer](https://github.com/GoogleChrome/puppeteer)'s export to PDF feature.

It can handle authentication by injecting cookies or [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) items into Headless Chromium.
It also generates better looking PDF than Puppeteer by resizing the browser page to the paper format before triggering the PDF export.

The library is also available as a [server](https://npmjs.org/package/browser-based-export-server) and an [AWS Lambda](https://github.com/activeviam/browser-based-export/tree/master/packages/browser-based-pdf-export-lambda).

## Export isolation

Every export happens in an isolated incognito Chromium context.
It means that the cookies, Web Storage items or any sensitive information will not be shared across exports.
Even if they are launched in parallel.

# Usage

## Example

```javascript
const {inBrowser} = require('browser-based-export');

// Start Headless Chromium and automatically close it when the passed callback resolves.
inBrowser({
  action: ({exportPdf}) =>
    exportPdf({
      payload: {
        url: 'https://example.com',
      },
      timeoutInSeconds: 10,
    }).then(pdfBuffer => {
      // Do something with it.
    }),
});
```

Take a look at:

* an [example payload](src/examples.js)
* the [payload schema](src/schemas.js)

## Troubleshooting

This package is using the [debug](https://www.npmjs.com/package/debug) utility.
Set the `DEBUG` environment variable to `browser-based-export:*` to see the debug messages.

If that's not enough, you can follow the [Puppeteer debugging tips](https://github.com/GoogleChrome/puppeteer/tree/v1.4.0#debugging-tips).
