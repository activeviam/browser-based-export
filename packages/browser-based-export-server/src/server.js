'use strict';

const {inBrowser} = require('browser-based-export');
const bodyParser = require('body-parser');
const express = require('express');
const expressWinston = require('express-winston');
const pFinally = require('p-finally');
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

const closeServer = server =>
  new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const withServer = ({
  action,
  app,
  port = 0, // Use 0 to let the OS pick any available port.
}) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, error => {
      if (error) {
        reject(error);
      }

      const close = () => closeServer(server);

      pFinally(action({port: server.address().port}), close).then(
        resolve,
        reject
      );
    });
  });

const inBrowserWithServer = ({
  action = ({port}) =>
    new Promise(() => {
      winston.info(`now serving on port ${port}`);
      // The default action never resolves.
      // The server keeps running until its process is killed by the user/system.
    }),
  config,
}) =>
  inBrowser({
    action: ({exportPdf}) => {
      const app = express();

      app.use(bodyParser.json());

      useLogging(app, config.log);

      const routes = getRoutes({
        config: config.routes,
        exportPdf,
      });

      Object.keys(routes).forEach(path => {
        Object.keys(routes[path]).forEach(method => {
          app[method.toLowerCase()](path, routes[path][method].handle);
        });
      });

      return withServer({
        action,
        app,
        port: config.port,
      });
    },
  });

module.exports = {withServer: inBrowserWithServer};
