'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const expressWinston = require('express-winston');
const winston = require('winston');

const getRoutes = require('./routes');

const useLogging = (app, {colorize, level}) => {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console({colorize, level})],
    })
  );

  winston.configure({
    transports: [
      new winston.transports.Console({
        colorize,
        level,
        prettyPrint: true,
      }),
    ],
  });
};

const createServer = config =>
  new Promise((resolve, reject) => {
    const app = express();

    app.use(bodyParser.json());

    useLogging(app, config.log);

    const routes = getRoutes(config.routes);

    Object.keys(routes).forEach(path => {
      Object.keys(routes[path]).forEach(method => {
        app[method.toLowerCase()](path, routes[path][method].handle);
      });
    });

    const server = app.listen(
      // Use `0` to let the OS pick any available port.
      config.port || 0,
      error => {
        if (error) {
          reject(error);
        }

        const actualPort = server.address().port;
        winston.info(`now serving on port ${actualPort}`);

        resolve({
          app,
          close: () =>
            new Promise((resolveClose, rejectClose) => {
              server.close(
                closingError =>
                  closingError ? rejectClose(closingError) : resolveClose()
              );
            }),
          port: actualPort,
        });
      }
    );
  });

module.exports = {createServer};
