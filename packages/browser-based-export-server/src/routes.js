'use strict';

const {
  pdfExportExamplePayload,
  pdfExportPayloadSchema,
} = require('browser-based-export');
const winston = require('winston');

const ensureJson = message => {
  try {
    JSON.parse(message);
    return message;
  } catch (error) {
    return JSON.stringify({message});
  }
};

// We use declarative routing to provide living documentation for free.
const getRoutes = ({config, exportPdf}) => {
  const routes = {
    '/': {
      GET: {
        description: 'Returns this routing information for introspection.',
        handle(req, res) {
          res.json(
            JSON.parse(
              JSON.stringify(
                routes,
                (key, value) => (key === 'handle' ? undefined : value)
              )
            )
          );
        },
      },
    },
    '/v1/pdf': {
      POST: {
        description:
          'Open the given URL with Headless Chromium, export what is displayed as a PDF, and download it.',
        example: pdfExportExamplePayload,
        handle: async (req, res) => {
          const {body} = req;
          winston.verbose('starting PDF export', body);

          try {
            const {url} = body;
            if (!config.pdfExport.authorizedUrlRegex.test(url)) {
              throw new Error(`The URL ${url} is not authorized.`);
            }
            const pdf = await exportPdf({
              payload: body,
              timeoutInSeconds: config.pdfExport.timeoutInSeconds,
            });
            res.setHeader('Content-disposition', 'attachment');
            res.setHeader('Content-type', 'application/pdf');
            res.send(pdf);
          } catch (error) {
            winston.error(error);
            res.status(500);
            res.set('Content-Type', 'application/json');
            res.send(ensureJson(error.message));
          }
        },
        schema: pdfExportPayloadSchema,
      },
    },
  };

  return routes;
};

module.exports = getRoutes;
