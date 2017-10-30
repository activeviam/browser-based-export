# Goal

`browser-export` is a wrapper on top of [Puppeteer](https://github.com/GoogleChrome/puppeteer)'s export to PDF feature.

It can handle authentication by injecting cookies or _localStorage_ items into Headless Chromium.
It also generates better looking PDF than Puppeteer by resizing the browser page to the paper format before triggering the PDF export.

## Session isolation

Every export happens in a separate Chromium context.
It means that the cookies, [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) items or any sensitive information will not be shared accross exports.
Even if they are launched in parallel.

## Note

This package is completely agnostic of the web application to export and should remain so.
Thus, any feature or option that would couple it to ActiveUI (for instance) does not belong here.

# Usage

## Example

```javascript
const {exportPdf} = require('@activeviam/browser-export');

exportPdf({
  /* payload */
}).then(pdfBuffer => {
  // Do something with it.
});
```

Here is an [example payload](examples.js).
