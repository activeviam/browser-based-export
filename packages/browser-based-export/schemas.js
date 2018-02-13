'use strict';

const dedent = require('dedent');

const {availablePaperFormats, paperDimensionFormat} = require('./paper');

const pdfExportPayloadSchema = {
  properties: {
    authentication: {
      description: dedent`
        The application from which the PDF should be exported might require authentication.
        Since the PDF export happens in Headless Chromium, we need some way to forward to the browser some credentials/tokens/cookies.
      `,
      properties: {
        cookies: {
          description: dedent`
            Cookies to inject into the browser page.
            See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
          `,
          items: {
            properties: {
              domain: {
                description: dedent`
                  Specifies allowed hosts to receive the cookie.
                  If unspecified, it defaults to the host of the current document location, excluding subdomains.
                  If Domain is specified, then subdomains are always included.
                `,
                example: 'customer.activeviam.com',
                type: 'string',
              },
              expires: {
                description: 'Unix time in seconds.',
                example: 1509574531,
                minimum: 0,
                type: 'integer',
              },
              httpOnly: {
                default: false,
                description: dedent`
                  HttpOnly cookies are inaccessible to JavaScript's Document.cookie API.
                  They are only sent to the server.
                `,
                type: 'boolean',
              },
              name: {
                example: 'JSESSIONID',
                type: 'string',
              },
              path: {
                description: dedent`
                  Indicates a URL path that must exist in the requested URL in order to send the Cookie header.
                  The %x2F ("/") character is considered a directory separator, and subdirectories will match as well.
                `,
                example: '/',
                type: 'string',
              },
              secure: {
                default: false,
                description: dedent`
                  A secure cookie is only sent to the server with a encrypted request over the HTTPS protocol.
                  Even with Secure, sensitive information should never be stored in cookies,
                  as they are inherently insecure and this flag can't offer real protection.
                `,
                type: 'boolean',
              },
              value: {
                example: '8835D6F1C74CB23E498F9C6928EFF858',
                type: 'string',
              },
            },
            required: ['name', 'value'],
            type: 'object',
          },
          type: 'array',
        },
        webStorageItems: {
          description: dedent`
            Web Storage items to inject into the browser page.
            See https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
          `,
          items: {
            properties: {
              key: {
                description: 'Item key.',
                example: 'jwt-token',
                type: 'string',
              },
              type: {
                description: 'The type of Web Storage to use.',
                enum: ['local', 'session'],
                type: 'string',
              },
              value: {
                description: 'Item value.',
                example:
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
                type: 'string',
              },
            },
            required: ['key', 'type', 'value'],
          },
          type: 'array',
        },
      },
      type: 'object',
    },
    paper: {
      description: 'Describes the PDF paper dimensions.',
      oneOf: [
        {
          properties: {
            height: {
              description: 'Paper height accepting values labeled with units.',
              example: '20cm, 200mm, 8in, or 100px',
              pattern: paperDimensionFormat,
              type: 'string',
            },
            width: {
              description: 'Paper width accepting values labeled with units.',
              example: '40cm, 400mm, 16in, or 200px',
              pattern: paperDimensionFormat,
              type: 'string',
            },
          },
          required: ['height', 'width'],
        },
        {
          properties: {
            format: {
              description: 'One of the predefined paper formats.',
              enum: availablePaperFormats,
              type: 'string',
            },
            landscape: {
              default: false,
              description: 'Paper orientation.',
              type: 'boolean',
            },
          },
          required: ['format'],
        },
      ],
      type: 'object',
    },
    url: {
      description: 'The URL to open.',
      example: 'https://example.com',
      format: 'uri',
      type: 'string',
    },
    waitUntil: {
      description: ` Used to have the browser wait before exporting the page to PDF.`,
      properties: {
        networkIdle: {
          description:
            'If `true`, wait until there has been no pending network requests during 500 milliseconds.',
          type: 'boolean',
        },
      },
      type: 'object',
    },
  },
  required: ['url'],
  title: 'PDF export payload',
  type: 'object',
};

module.exports = {pdfExportPayloadSchema};
