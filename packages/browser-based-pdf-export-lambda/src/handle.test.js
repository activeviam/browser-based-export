/* eslint-env jest */
'use strict';

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
      log() {
        /* noop */
      },
      timeoutInSeconds,
    });
  });

test('returns an error response when given an invalid payload', () =>
  callHandler({paper: {format: 'unexisting'}, url: 'http://localhost'}).then(
    response => {
      expect(response.statusCode).toBe(500);
      expect(response.body).toMatch(
        /should be equal to one of the allowed values/
      );
    }
  ));

test('returns an error response when the URL is not authorized', () => {
  const url = 'https://bad.domain.com';
  return callHandler({url}).then(response => {
    expect(response.statusCode).toBe(500);
    expect(response.body).toMatch(
      // It's safe to disable the rule as we control the timeout value.
      // eslint-disable-next-line security/detect-non-literal-regexp
      new RegExp(`The URL ${url} is not authorized\\.`)
    );
  });
});

describe('with running server', () => {
  const testEnvironment = {};

  beforeAll(() =>
    new Promise(resolve => {
      const app = express();

      app.get('/', (req, res) => {
        res.send('Hello World!');
      });

      const server = app.listen(0, () => {
        Object.assign(testEnvironment, {
          closeServer: () =>
            new Promise((resolveClose, rejectClose) => {
              server.close(
                closingError =>
                  closingError ? rejectClose(closingError) : resolveClose()
              );
            }),
          serverUrl: `http://localhost:${server.address().port}`,
        });
        resolve();
      });
    }));

  afterAll(() => testEnvironment.closeServer());

  test(
    'returns a response with a base64 encoded PDF body',
    () =>
      callHandler({url: testEnvironment.serverUrl}).then(response => {
        expect(response.statusCode).toBe(200);
        expect(response.isBase64Encoded).toBe(true);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(isBase64(response.body)).toBe(true);
      }),
    timeoutInSeconds * 1000
  );
});
