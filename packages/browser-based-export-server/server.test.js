/* eslint-env jest */

'use strict';

const request = require('request-promise-native');

const {createServer} = require('./server');

const testEnvironment = {};

beforeAll(() =>
  createServer({
    log: {
      // Use critical logging level as we are going to test error cases and
      // we don't want them to pollute the console.
      level: 'crit',
    },
    routes: {
      pdfExport: {
        // Authorize all URLs.
        authorizedUrlRegex: /localhost/,
        timeoutInSeconds: 7,
      },
    },
  }).then(({close, port}) => {
    Object.assign(testEnvironment, {
      serverUrl: `http://localhost:${port}`,
      stopServer: close,
    });
  })
);

afterAll(() => testEnvironment.stopServer());

const getRequestOptions = (path, payload) => ({
  body: payload,
  json: true,
  resolveWithFullResponse: true,
  simple: false,
  url: `${testEnvironment.serverUrl}${path}`,
});

test('/ returns the routing information', () =>
  request.get(getRequestOptions('/')).then(response => {
    expect(response.statusCode).toBe(200);
    expect(response.body['/'].GET.description).toBe(
      'Returns this routing information for introspection.'
    );
  }));

describe('/v1/pdf', () => {
  const exportPdf = payload =>
    request.post(getRequestOptions('/v1/pdf', payload));

  test('returns an error response when given an invalid payload', () =>
    exportPdf({
      paper: {format: 'unexisting'},
      url: testEnvironment.serverUrl,
    }).then(response => {
      expect(response.statusCode).toBe(500);
      expect(response.body).toMatch(
        /should be equal to one of the allowed values/
      );
    }));

  test('returns an error response when the URL is not authorized', () =>
    exportPdf({url: 'https://bad.domain.com'}).then(response => {
      expect(response.statusCode).toBe(500);
      expect(response.body).toMatch(/The URL .+ is not authorized/);
    }));

  // Exports to PDF the routing information page of the server started in `beforeAll`.
  test('returns a response with a PDF buffer body', () =>
    exportPdf({url: testEnvironment.serverUrl}).then(response => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    }));
});
