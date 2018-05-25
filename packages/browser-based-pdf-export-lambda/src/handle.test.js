/* eslint-env jest */
'use strict';

const path = require('path');
const {promisify} = require('util');

const express = require('express');
const isBase64 = require('is-base64');

const handle = require('./handle');

const timeoutInSeconds = 3;

const callHandler = payload =>
  new Promise(resolve => {
    handle({
      callback(error, response) {
        expect(error).toBeNull();
        resolve(response);
      },
      config: {authorizedUrlRegex: /localhost/},
      event: payload,
      // Test against the same Chromium version than the one that will be bundled in the zip used in the AWS Lambda.
      // It gives stronger guarantees than if we were using the version of Chromium downloaded by Puppeteer.
      headlessChromiumPath: path.resolve(
        __dirname,
        '../dist/headless-chromium'
      ),
      log() {
        /* noop */
      },
      timeoutInSeconds,
    });
  });

test('returns an error response when given an invalid payload', async () => {
  const response = await callHandler({
    paper: {format: 'unexisting'},
    url: 'http://localhost',
  });
  expect(response.statusCode).toBe(500);
  expect(response.body).toMatch(/should be equal to one of the allowed values/);
});

test('returns an error response when the URL is not authorized', async () => {
  const url = 'https://bad.domain.com';
  const response = await callHandler({url});
  expect(response.statusCode).toBe(500);
  expect(response.body).toMatch(
    // It's safe to disable the rule as we control the timeout value.
    // eslint-disable-next-line security/detect-non-literal-regexp
    new RegExp(`The URL ${url} is not authorized\\.`)
  );
});

describe('with running server', () => {
  const testEnvironment = {};

  const startServer = app =>
    new Promise((resolve, reject) => {
      const server = app.listen(
        0, // Use 0 to let the OS pick any available port.
        error => {
          if (error) {
            reject(error);
          } else {
            resolve(server);
          }
        }
      );
    });

  beforeAll(async () => {
    const app = express();

    app.get('/', (req, res) => {
      res.send('Hello World!');
    });

    const server = await startServer(app);
    Object.assign(testEnvironment, {
      closeServer: promisify(server.close.bind(server)),
      serverUrl: `http://localhost:${server.address().port}`,
    });
  });

  afterAll(() => testEnvironment.closeServer());

  test(
    'returns a response with a base64 encoded PDF body',
    async () => {
      const response = await callHandler({url: testEnvironment.serverUrl});
      expect(response.statusCode).toBe(200);
      expect(response.isBase64Encoded).toBe(true);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(isBase64(response.body)).toBe(true);
    },
    timeoutInSeconds * 1000
  );
});
