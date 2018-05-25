'use strict';

const {inBrowser} = require('browser-based-export');

const getPayload = ({event, log}) => {
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
};

const handle = ({
  callback,
  config: {authorizedUrlRegex},
  event,
  headlessChromiumPath,
  log,
  timeoutInSeconds,
}) => {
  log({event});

  Promise.resolve()
    .then(() => getPayload({event, log}))
    .then(payload => {
      const {url} = payload;
      if (!authorizedUrlRegex.test(url)) {
        throw new Error(`The URL ${url} is not authorized.`);
      }

      return inBrowser({
        // See https://github.com/GoogleChrome/puppeteer/issues/2608
        _dontUseIncognitoContext: true,
        action: ({exportPdf}) =>
          exportPdf({
            payload,
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
          }),
        puppeteerOptions: {
          // See https://github.com/adieuadieu/serverless-chrome/issues/15#issuecomment-301774667
          args: ['--no-sandbox', '--single-process'],
          executablePath: headlessChromiumPath,
        },
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
