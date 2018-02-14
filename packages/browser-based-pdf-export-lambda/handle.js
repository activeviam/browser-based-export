'use strict';

const {exportPdf} = require('@activeviam/browser-based-export');

const handle = ({
  callback,
  config: {authorizedUrlRegex},
  event,
  log,
  puppeteerOptions,
  timeoutInSeconds,
}) => {
  log({event});

  Promise.resolve()
    .then(() => {
      if (event.isBase64Encoded) {
        // When the event contains the "isBase64Encoded" flag, it means that it's coming from the API Gateway.
        // We need to convert it to UTF-8 to get the JSON string and parse it to get the actual payload.
        const payload = JSON.parse(
          Buffer.from(event.body, 'base64').toString('utf8')
        );
        log({payload});
        return payload;
      }

      // Otherwise, it's an already deserialized test event.
      return event;
    })
    .then(payload => {
      const {url} = payload;
      if (!authorizedUrlRegex.test(url)) {
        throw new Error(`The URL ${url} is not authorized.`);
      }

      return exportPdf({
        payload,
        puppeteerOptions,
        timeoutInSeconds,
      }).then(pdf => {
        callback(null, {
          // The body must be a string so we have to serialize the PDF buffer.
          body: pdf.toString('base64'),
          headers: {
            'content-disposition': 'attachment',
            'content-type': 'application/pdf',
          },
          // This flag is used to tell the API Gateway to convert the base64 string back to binary.
          // See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html.
          // And https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html.
          isBase64Encoded: true,
          statusCode: 200,
        });
      });
    })
    .catch(error => {
      log({error});
      callback(null, {
        body: error.message,
        statusCode: 500,
      });
    });
};

module.exports = handle;
