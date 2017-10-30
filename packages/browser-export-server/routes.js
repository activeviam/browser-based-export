'use strict';

const {
  exportPdf,
  pdfExportExamplePayload,
  pdfExportPayloadSchema,
} = require('@activeviam/browser-export');
const winston = require('winston');

// We use declarative routing to provide living documentation for free.
const getRoutes = config => {
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
          'Open the given URL with Headless Chromium, export what is displayed as a PDF and download it.',
        example: pdfExportExamplePayload,
        handle(req, res) {
          const {body} = req;
          winston.verbose('starting PDF export', body);
          Promise.resolve()
            .then(() => {
              const {url} = body;
              if (!config.pdfExport.authorizedUrlRegex.test(url)) {
                throw new Error(`The URL ${url} is not authorized.`);
              }
            })
            .then(() =>
              exportPdf(body, config.pdfExport.timeoutInSeconds).then(pdf => {
                res.setHeader('Content-disposition', 'attachment');
                res.setHeader('Content-type', 'application/pdf');
                res.send(pdf);
              })
            )
            .catch(error => {
              winston.error(error);
              res.status(500).json(error.message);
            });
        },
        schema: pdfExportPayloadSchema,
      },
    },
  };

  return routes;
};

module.exports = getRoutes;