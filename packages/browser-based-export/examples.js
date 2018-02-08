'use strict';

const pdfExportExamplePayload = {
  authentication: {
    cookies: [
      {
        name: 'JSESSIONID',
        secure: true,
        value: '8835D6F1C74CB23E498F9C6928EFF858',
      },
    ],
    webStorageItems: [
      {
        key: 'jwt-token',
        type: 'local',
        value:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
      },
    ],
  },
  paper: {
    height: '1080px',
    width: '1920px',
  },
  url: 'https://example.com',
  waitUntil: {
    networkIdle: true,
  },
};

module.exports = {pdfExportExamplePayload};
