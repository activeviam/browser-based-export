'use strict';

const envalid = require('envalid');

const env = envalid.cleanEnv(
  // eslint-disable-next-line no-process-env
  process.env,
  {
    AUTHORIZED_URL_PATTERN: envalid.str({
      desc:
        'The regular expression pattern that the URL to export has to match to be authorized.',
    }),
  },
  {strict: true}
);

module.exports = {
  // We can safely disable the next warning as this is a variable
  // coming from the AWS Lambda environment and not a user input.
  // eslint-disable-next-line security/detect-non-literal-regexp
  authorizedUrlRegex: new RegExp(env.AUTHORIZED_URL_PATTERN),
};
