[![build status](https://img.shields.io/circleci/project/github/activeviam/browser-based-export.svg)](https://circleci.com/gh/activeviam/browser-based-export)

# Goal

`browser-based-pdf-export-lambda` is an AWS Lambda made for exporting a web application at a given URL to a PDF file.

# Usage

1.  Create a Node.js AWS Lambda function "from scratch" with the "Node.js 8.10" runtime.
2.  Click on your Lambda tile in the "Designer" panel.
    Under the "Function code" section, change the "Code entry type" to "Upload a .zip file".
3.  Upload one of the [released .zip files](https://github.com/activeviam/browser-based-export/releases).
4.  Add the desired [environment variables](src/config.js), configure the "Timeout" under the "Basic Settings" and increase the "Memory" to 1GB for instance.
5.  Add an "API Gateway" trigger under the "Designer" section.
6.  Click on the "save" button on the upper right corner.
7.  Click on the "API Gateway" tile in the "Designer" panel.
    Click on the main link of the "API Gateway" section.
    Go to the "settings" tab of the corresponding "API".
    Add the "\*/\*" entry in the "Binary Media Types" section.
8.  Trigger the "Deploy API" action in the "resources" tab.
9.  Your AWS Lambda should now be live, you can start sending it requests.
    See [`browser-based-export`'s README](../browser-based-export/README.md) for more information about what payload can be sent to the AWS Lambda and troubleshooting.
