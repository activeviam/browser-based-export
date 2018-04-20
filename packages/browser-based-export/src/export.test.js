/* eslint-disable max-lines */
/* eslint-env jest */

'use strict';

const cookieParser = require('cookie-parser');
const express = require('express');
const pTime = require('p-time');
const pdfText = require('pdf-text');

const {exportPdf} = require('./export');

const withServer = ({appCallback, onReadyCallback}) => {
  const app = express();

  app.use(cookieParser());
  app.get('/', appCallback);

  return new Promise((resolve, reject) => {
    const server = app.listen(
      // Let the OS pick an available port so that we can have several servers running in parallel.
      0,
      () => {
        const serverUrl = `http://localhost:${server.address().port}`;
        onReadyCallback(serverUrl).then(
          result =>
            server.close(() => {
              resolve(result);
            }),
          error =>
            server.close(() => {
              reject(error);
            })
        );
      }
    );
  });
};

const getPdf = ({appCallback, exportOptions, timeoutInSeconds}) =>
  withServer({
    appCallback,
    onReadyCallback: url =>
      exportPdf({
        payload: Object.assign({}, exportOptions, {url}),
        timeoutInSeconds,
      }),
  });

const getPdfText = options =>
  getPdf(options).then(
    pdf =>
      new Promise((resolve, reject) => {
        pdfText(pdf, (err, chunks) => {
          if (err) {
            reject(err);
          } else {
            resolve(chunks.join(''));
          }
        });
      })
  );

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
  // We run the experiments in parallel to check that they indeed run in isolated sessions.
  const testWithControlExperiment = ({
    appCallback,
    controlExperiment,
    testExperiment,
  }) =>
    Promise.all(
      [controlExperiment, testExperiment].map(({exportOptions, check}) =>
        getPdfText({
          appCallback,
          exportOptions,
          timeoutInSeconds,
        }).then(check)
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

  // An order of magnitude should be enough to measure
  // the timing with an acceptable accuracy.
  const getMillisecondsDelayFromControlExperiment = controlExperimentDuration =>
    10 * controlExperimentDuration;

  const expectDuration = (actual, expected, tolerance) => {
    expect(actual).toBeGreaterThanOrEqual(expected * (1 - tolerance));
    expect(actual).toBeLessThanOrEqual(expected * (1 + tolerance));
  };

  const testEnvironment = {};

  const controlExperimentTimeoutInSeconds = 7;
  beforeAll(() => {
    const controlExperiment = pTime(getPdfText)({
      appCallback(req, res) {
        res.send(responseText);
      },
      exportOptions: {
        // No custom options.
      },
      timeoutInSeconds: controlExperimentTimeoutInSeconds,
    });

    return controlExperiment.then(controlText => {
      expect(controlText).toBe(responseText);
      Object.assign(testEnvironment, {
        controlExperimentDurationInMilliseconds: controlExperiment.time,
      });
    });
  }, controlExperimentTimeoutInSeconds * 1000);

  const performTestExperiment = ({
    getExperimentOptions,
    getActualDelayWaitedMilliseconds = ({
      testExperimentDurationInMilliseconds,
    }) =>
      testExperimentDurationInMilliseconds -
      testEnvironment.controlExperimentDurationInMilliseconds,
    jestTimeoutInMilliseconds,
    tolerance,
  }) => {
    const getDelaysAndExperimentOptions = () => {
      const delayToWaitForInMilliseconds = getMillisecondsDelayFromControlExperiment(
        testEnvironment.controlExperimentDurationInMilliseconds
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
      () => {
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

        return testExperiment.then(testText => {
          expect(testText).toBe(responseText);
          expectDuration(
            getActualDelayWaitedMilliseconds({
              delayToWaitForInMilliseconds,
              testExperimentDurationInMilliseconds: testExperiment.time,
            }),
            delayToWaitForInMilliseconds,
            tolerance
          );
        });
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
      jestTimeoutInMilliseconds: 30000,
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
        testEnvironment.controlExperimentDurationInMilliseconds -
        // We only want to count the delay incurred by the `fetch` call,
        // not the one that happened when Chromium loaded the page in the first time.
        delayToWaitForInMilliseconds -
        // Puppeteer considers the network to actually be idle, when there has been no pending
        // requests in the last 500 milliseconds.
        500,
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
      jestTimeoutInMilliseconds: 45000,
      // That's a big tolerance!
      // The behavior is the expected one, it's just Chromium taking its time...
      tolerance: 0.5,
    });
  });
});
