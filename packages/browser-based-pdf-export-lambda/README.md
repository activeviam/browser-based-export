# Goal

`browser-based-pdf-export-lambda` creates a .zip file deployable as a Node.js AWS Lambda to export a web application at a given URL to a PDF file.

# Usage

## Build

To create the deployable .zip file, run the following command: `yarn install && yarn run build`.

## Deployment

1.  Create a Node.js AWS Lambda function "from scratch" with the "Node.js 8.10" runtime.
2.  Click on your Lambda tile in the "Designer" panel.
    Under the "Function code" section, change the "Code entry type" to "Upload a .zip file".
3.  Upload the previously created .zip file.
4.  Add the desired [environment variables](src/config.js), configure the "Timeout" under the "Basic Settings" and increase the "Memory" to 1GB for instance.
5.  Add an "API Gateway" trigger under the "Designer" section.
6.  Click on the "save" button on the upper right corner.
7.  Click on the "API Gateway" tile in the "Designer" panel.
    Click on the main link of the "API Gateway" section.
    Go to the "settings" tab of the corresponding "API".
    Add the "\*/\*" entry in the "Binary Media Types" section.
8.  Trigger the "Deploy API" action in the "resources" tab.
