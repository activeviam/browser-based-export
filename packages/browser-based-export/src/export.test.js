/* eslint-disable max-lines */
/* eslint-env jest */

'use strict';

const {promisify} = require('util');

const cookieParser = require('cookie-parser');
const express = require('express');
const pTime = require('p-time');
const pdfText = promisify(require('pdf-text'));

const {inBrowser} = require('..');

const testEnvironment = {};

beforeAll(() =>
  new Promise(resolve =>
    inBrowser({
      action: ({exportPdf}) =>
        new Promise(resolveAction => {
          Object.assign(testEnvironment, {exportPdf, resolve: resolveAction});
          resolve();
        }),
    })
  ));

afterAll(() => testEnvironment.resolve());

const startServer = app =>
  new Promise((resolve, reject) => {
    const server = app.listen(
      0, // Let the OS pick an available port so that we can have several servers running in parallel.
      error => {
        if (error) {
          reject(error);
        } else {
          resolve(server);
        }
      }
    );
  });

const withServer = async ({appCallback, onReadyCallback}) => {
  const app = express();

  app.use(cookieParser());
  app.get('/', appCallback);

  const server = await startServer(app);
  const serverUrl = `http://localhost:${server.address().port}`;

  try {
    return await onReadyCallback(serverUrl);
  } finally {
    await promisify(server.close.bind(server))();
  }
};

const getPdf = ({appCallback, exportOptions, timeoutInSeconds}) =>
  withServer({
    appCallback,
    onReadyCallback: url =>
      testEnvironment.exportPdf({
        payload: Object.assign({}, exportOptions, {url}),
        timeoutInSeconds,
      }),
  });

const getPdfText = async options => {
  const pdf = await getPdf(options);
  const chunks = await pdfText(pdf);
  return chunks.join('');
};

const getHtmlWithScript = cb => {
  const rootId = 'root';
  return `
    <body>
      <div id="${rootId}"></div>
      <script>
        ${cb(rootId)}
      </script>
    </body>
  `;
};

describe('authentication', () => {
  const timeoutInSeconds = 7;

  // Relies on a control experiment to ensure the behaviour observed with the test
  // experiment is really a consequence of the options given to `exportPdf` and not a coincidence.
  // We run the experiments in parallel to check that they indeed run in isolated incognito context.
  const testWithControlExperiment = ({
    appCallback,
    controlExperiment,
    testExperiment,
  }) =>
    Promise.all(
      [controlExperiment, testExperiment].map(
        async ({exportOptions, check}) => {
          const text = await getPdfText({
            appCallback,
            exportOptions,
            timeoutInSeconds,
          });
          check(text);
        }
      )
    );

  test(
    'cookies can be added',
    () => {
      const cookie = {name: 'name', value: 'value'};

      return testWithControlExperiment({
        appCallback(req, res) {
          res.send(JSON.stringify(req.cookies));
        },
        controlExperiment: {
          check(text) {
            expect(JSON.parse(text)).toEqual({});
          },
          exportOptions: {
            authentication: {
              // No cookies.
            },
          },
        },
        testExperiment: {
          check(text) {
            expect(JSON.parse(text)).toEqual({[cookie.name]: cookie.value});
          },
          exportOptions: {
            authentication: {
              cookies: [cookie],
            },
          },
        },
      });
    },
    timeoutInSeconds * 1000
  );

  describe('web storage items can be added', () => {
    ['local', 'session'].forEach(type => {
      test(
        type,
        () => {
          const noItemText = 'noItemText';
          const webStorageItem = {key: 'key', value: 'value'};

          return testWithControlExperiment({
            appCallback(req, res) {
              res.send(
                getHtmlWithScript(
                  rootId =>
                    `document.getElementById('${rootId}').innerHTML = ${type}Storage.getItem('${
                      webStorageItem.key
                    }') || '${noItemText}';`
                )
              );
            },
            controlExperiment: {
              check(text) {
                expect(text).toBe(noItemText);
              },
              exportOptions: {
                authentication: {
                  // Nothing to put in Web Storage.
                },
              },
            },
            testExperiment: {
              check(text) {
                expect(text).toBe(webStorageItem.value);
              },
              exportOptions: {
                authentication: {
                  webStorageItems: [Object.assign({type}, webStorageItem)],
                },
              },
            },
          });
        },
        timeoutInSeconds * 1000
      );
    });
  });
});

describe('waiting before triggering the export', () => {
  const responseText = 'control-text';

  // An order of magnitude should be enough to measure the timing with an acceptable accuracy.
  const getMillisecondsDelayFromControlExperiment = controlExperimentDuration =>
    10 * controlExperimentDuration;

  const expectDuration = (actual, expected, tolerance) => {
    expect(actual).toBeGreaterThanOrEqual(expected * (1 - tolerance));
    expect(actual).toBeLessThanOrEqual(expected * (1 + tolerance));
  };

  const waitingTestEnvironment = {};

  const controlExperimentTimeoutInSeconds = 3;
  beforeAll(async () => {
    const controlExperiment = pTime(getPdfText)({
      appCallback(req, res) {
        res.send(responseText);
      },
      exportOptions: {
        // No custom options.
      },
      timeoutInSeconds: controlExperimentTimeoutInSeconds,
    });

    const controlText = await controlExperiment;
    expect(controlText).toBe(responseText);
    Object.assign(waitingTestEnvironment, {
      controlExperimentDurationInMilliseconds: controlExperiment.time,
    });
  }, controlExperimentTimeoutInSeconds * 1000);

  const performTestExperiment = ({
    getExperimentOptions,
    getActualDelayWaitedMilliseconds = ({
      testExperimentDurationInMilliseconds,
    }) =>
      testExperimentDurationInMilliseconds -
      waitingTestEnvironment.controlExperimentDurationInMilliseconds,
    jestTimeoutInMilliseconds,
    tolerance,
  }) => {
    const getDelaysAndExperimentOptions = () => {
      const delayToWaitForInMilliseconds = getMillisecondsDelayFromControlExperiment(
        waitingTestEnvironment.controlExperimentDurationInMilliseconds
      );
      return {
        delayToWaitForInMilliseconds,
        delayToWaitForInSeconds: delayToWaitForInMilliseconds / 1000,
        experimentOptions: getExperimentOptions(delayToWaitForInMilliseconds),
      };
    };

    test(
      'should timeout',
      () => {
        const {
          delayToWaitForInSeconds,
          experimentOptions,
        } = getDelaysAndExperimentOptions();

        return expect(
          getPdfText(
            Object.assign({}, experimentOptions, {
              // We want to test the timeout here so we make sure it's smaller
              // than the delay we are going to wait for.
              timeoutInSeconds: delayToWaitForInSeconds / 2,
            })
          )
        ).rejects.toThrow(/timeout/i);
      },
      jestTimeoutInMilliseconds
    );

    test(
      'should not timeout',
      async () => {
        const {
          delayToWaitForInMilliseconds,
          delayToWaitForInSeconds,
          experimentOptions,
        } = getDelaysAndExperimentOptions();

        const testExperiment = pTime(getPdfText)(
          Object.assign({}, experimentOptions, {
            // We don't want to test the timeout here so we make sure it's greater
            // than the delay we are going to wait for.
            timeoutInSeconds: 10 * delayToWaitForInSeconds,
          })
        );

        const testText = await testExperiment;
        expect(testText).toBe(responseText);
        expectDuration(
          getActualDelayWaitedMilliseconds({
            delayToWaitForInMilliseconds,
            testExperimentDurationInMilliseconds: testExperiment.time,
          }),
          delayToWaitForInMilliseconds,
          tolerance
        );
      },
      jestTimeoutInMilliseconds
    );
  };

  describe('wait until render complete', () => {
    performTestExperiment({
      getExperimentOptions: delayToWaitForInMilliseconds => ({
        appCallback(req, res) {
          res.send(
            getHtmlWithScript(
              rootId => `
                // Indicate that the application is not ready yet.
                window.renderComplete = false;

                setTimeout(() => {
                  document.getElementById('${rootId}').innerHTML = '${responseText}';

                  // Now the application is ready.
                  window.renderComplete = true;
                }, ${delayToWaitForInMilliseconds});
              `
            )
          );
        },
        exportOptions: {
          // No custom options needed. This is a built-in behavior.
        },
      }),
      jestTimeoutInMilliseconds: 10000,
      tolerance: 0.2,
    });
  });

  describe('wait until network idle', () => {
    performTestExperiment({
      getActualDelayWaitedMilliseconds: ({
        delayToWaitForInMilliseconds,
        testExperimentDurationInMilliseconds,
      }) =>
        testExperimentDurationInMilliseconds -
        waitingTestEnvironment.controlExperimentDurationInMilliseconds -
        // We only want to count the delay incurred by the `fetch` call,
        // not the one that happened when Chromium loaded the page in the first time.
        delayToWaitForInMilliseconds -
        // Puppeteer considers the network to actually be idle, when there has been no pending
        // requests for some amount of milliseconds.
        // It's supposed to be 500ms but, in practice, it's consistently around 1s.
        1000,
      getExperimentOptions: delayToWaitForInMilliseconds => ({
        appCallback(req, res) {
          setTimeout(() => {
            res.send(
              getHtmlWithScript(
                rootId => `
                  // Call the same endpoint once to trigger network activity.
                  fetch('${req.route.path}')
                    .then(() => {
                      document.getElementById('${rootId}').innerHTML = '${responseText}';
                    })
                `
              )
            );
          }, delayToWaitForInMilliseconds);
        },
        exportOptions: {
          waitUntil: {
            networkIdle: true,
          },
        },
      }),
      jestTimeoutInMilliseconds: 10000,
      tolerance: 0.45,
    });
  });
});
