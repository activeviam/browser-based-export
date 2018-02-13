/* eslint-disable no-console */
'use strict';

const path = require('path');

const {exportPdf} = require('@activeviam/browser-based-export');

const config = require('./config');

exports.handler = (event, context, callback) => {
  const timeoutInSeconds = Math.ceil(context.getRemainingTimeInMillis() / 1000);
  console.log({event});

  Promise.resolve()
    .then(() => {
      if (event.isBase64Encoded) {
        // When the event contains the "isBase64Encoded" flag, it means that it's coming from the API Gateway.
        // We need to convert it to UTF-8 to get the JSON string and parse it to get the actual payload.
        const payload = JSON.parse(
          Buffer.from(event.body, 'base64').toString('utf8')
        );
        console.log({payload});
        return payload;
      }

      // Otherwise, it's an already deserialized test event.
      return event;
    })
    .then(payload => {
      const {url} = payload;
      if (!config.authorizedUrlRegex.test(url)) {
        throw new Error(`The URL ${url} is not authorized.`);
      }

      return exportPdf({
        payload,
        puppeteerOptions: {
          args: ['--no-sandbox', '--single-process'],
          executablePath: path.resolve('.', 'headless-chromium'),
        },
        timeoutInSeconds,
      }).then(pdf =>
        callback(null, {
          // The body must be a string so wa have to serialize the PDF buffer.
          body: pdf.toString('base64'),
          headers: {
            'Content-disposition': 'attachment',
            'Content-type': 'application/pdf',
          },
          // This flag is used to tell the API Gateway to convert the base64 string
          // back to binary.
          // See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html.
          // And https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html.
          isBase64Encoded: true,
          statusCode: 200,
        })
      );
    })
    .catch(error => {
      console.log({error});
      callback(null, {
        body: error.message,
        statusCode: 500,
      });
    });
};
