/* eslint-env jest */

'use strict';

const Ajv = require('ajv');

const {pdfExportExamplePayload} = require('./examples.js');
const {pdfExportPayloadSchema} = require('./schemas');

const ajv = new Ajv({useDefaults: true});
const validate = ajv.compile(pdfExportPayloadSchema);

test('The PDF export example payload matches the schema', () => {
  validate(pdfExportExamplePayload);
  expect(validate.errors).toBeNull();
});
