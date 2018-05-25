/* eslint-env jest */

'use strict';

const request = require('request-promise-native');

const {withServer} = require('..');

const testEnvironment = {};
const timeoutInSeconds = 3;

beforeAll(() =>
  new Promise(resolve =>
    withServer({
      action: ({port}) =>
        new Promise(resolveAction => {
          Object.assign(testEnvironment, {
            resolve: resolveAction,
            serverUrl: `http://localhost:${port}`,
          });
          resolve();
        }),
      config: {
        log: {
          // Use critical logging level as we are going to test error cases and
          // we don't want them to pollute the console.
          level: 'crit',
        },
        routes: {
          pdfExport: {
            // Authorize all URLs.
            authorizedUrlRegex: /localhost/,
            timeoutInSeconds,
          },
        },
      },
    })
  ));

afterAll(() => testEnvironment.resolve());

const getRequestOptions = (path, payload) => ({
  body: payload,
  json: true,
  resolveWithFullResponse: true,
  simple: false,
  url: `${testEnvironment.serverUrl}${path}`,
});

test('/ returns the routing information', async () => {
  const response = await request.get(getRequestOptions('/'));
  expect(response.statusCode).toBe(200);
  expect(response.body['/'].GET.description).toBe(
    'Returns this routing information for introspection.'
  );
});

describe('/v1/pdf', () => {
  const exportPdf = payload =>
    request.post(getRequestOptions('/v1/pdf', payload));

  test('returns an error response when given an invalid payload', async () => {
    const response = await exportPdf({
      paper: {format: 'unexisting'},
      url: testEnvironment.serverUrl,
    });
    expect(response.statusCode).toBe(500);
    expect(JSON.stringify(response.body)).toMatch(
      /should be equal to one of the allowed values/
    );
  });

  test('returns an error response when the URL is not authorized', async () => {
    const url = 'https://bad.domain.com';
    const response = await exportPdf({url});
    expect(response.statusCode).toBe(500);
    expect(JSON.stringify(response.body)).toMatch(
      // It's safe to disable the rule as we control the timeout value.
      // eslint-disable-next-line security/detect-non-literal-regexp
      new RegExp(`The URL ${url} is not authorized\\.`)
    );
  });

  // Exports to PDF the routing information page of the server started in `beforeAll`.
  test(
    'returns a response with a PDF buffer body',
    async () => {
      const response = await exportPdf({url: testEnvironment.serverUrl});
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    },
    timeoutInSeconds * 1000
  );
});
