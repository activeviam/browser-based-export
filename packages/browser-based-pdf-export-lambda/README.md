# Goal

`browser-based-pdf-export-lambda` creates a .ZIP file deployable as a Node.js AWS Lambda to export a web application at a given URL to a PDF file.

# Usage

## Build

To create the deployable .ZIP file, run the following command: `yarn install && yarn run bundle && yarn run zip`.

## Deployment

1. Create a Node.js AWS Lambda function "from scratch".
2. Click on your Lambda tile in the "Designer" panel.
   Under the "Function code" section, change the "Code entry type" to "Upload a .ZIP file".
3. Upload the previously created .ZIP file.
4. Add the desired [environment variables](config.js), configure the "Timeout" under the "Basic Settings" and increase the "Memory" to 512MB for instance.
5. Add an "API Gateway" trigger under the "Designer" section.
6. Click on the "save" button on the upper right corner.
7. Click on the "API Gateway" tile in the "Designer" panel.
   Click on the main link of the "API Gateway" section.
   Go to the "settings" tab of the corresponding "API".
   Add the "\*/\*" entry in the "Binary Media Types" section.
8. Trigger the "Deploy API" action in the "resources" tab.
