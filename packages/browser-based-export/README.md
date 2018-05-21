# Goal

`browser-based-export` is a wrapper on top of [Puppeteer](https://github.com/GoogleChrome/puppeteer)'s export to PDF feature.

It can handle authentication by injecting cookies or _localStorage_ items into Headless Chromium.
It also generates better looking PDF than Puppeteer by resizing the browser page to the paper format before triggering the PDF export.

## Export isolation

Every export happens in an isolated incognito Chromium context.
It means that the cookies, [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) items or any sensitive information will not be shared across exports.
Even if they are launched in parallel.

## Note

This package is completely agnostic of the web application to export and should remain so.
Thus, any feature or option that would couple it to ActiveUI (for instance) does not belong here.

# Usage

## Example

```javascript
const {inBrowser} = require('@activeviam/browser-based-export');

// Start Headless Chromium and automatically close it when the passed callback resolves.
inBrowser({
  action: ({exportPdf) =>
    exportPdf({
      payload: {
        /* */
      },
      timeoutInSeconds: 10,
    }).then(pdfBuffer => {
      // Do something with it.
    }),
});
```

Here is an [example payload](examples.js).

## Troubleshooting

This package is using the [debug](https://www.npmjs.com/package/debug) utility.
Set the `DEBUG` environment variable to `@activeviam/browser-based-export:*` to see the debug messages.

If that's not enough, you can follow the [Puppeteer debugging tips](https://github.com/GoogleChrome/puppeteer/tree/v1.4.0#debugging-tips).
