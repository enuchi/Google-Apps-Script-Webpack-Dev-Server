# Google Apps Script / Webpack Dev Server

This package adapts Webpack Dev Server (https://github.com/webpack/webpack-dev-server) for use with React / Google Apps Script (https://github.com/enuchi/React-Google-Apps-Script) to enable live reloading during development.

Here's how a deployed [React / Google Apps Script](https://github.com/enuchi/React-Google-Apps-Script) project or published add-on looks in production:

**Production environment:**

A. Google Apps Script dialog window is loaded in Google Sheets.

    B. Your React app is an HTML page loaded directly inside the dialog window that can interact with your Google Apps server-side public functions.

Using this package, here's how it looks for development purposes:

**Development environment:**

A. Google Apps Script dialog window is loaded in Google Sheets.

    B. A simple React app is loaded inside the dialog window, which contains an iframe pointing to a locally running Dev Server (this package). The Dev Server loads an iframe that runs your embedded app during development and passes requests between the app and the parent Google Apps Script.

    B. Your React app is an HTML page loaded locally inside our custom Dev Server's iframe that can interact with your Google Apps server-side public functions, because the Dev Server is set up to pass requests to the Google Apps Script environment.

In short, this package acts as a sort of middle layer, for development purposes, between a Google Apps Script environment and your local environment, so that server functions can be called during development.

## Use

See the [React / Google Apps Script](https://github.com/enuchi/React-Google-Apps-Script) project for examples (coming soon).

## Background

To enable local development of React projects inside Google Apps Script projects with live reloading, we take the following approach:

1. Instead of loading the actual app's [html page inside a dialog window](<https://developers.google.com/apps-script/reference/html/html-service#createHtmlOutputFromFile(String)>), our Google Apps Script project needs to load an html page that contains an `<iframe>`. That iframe's "src" should point to a local address, e.g. https://localhost:3000/, which is running Webpack Dev Server. If we run our React app locally on this port using Webpack Dev Server, we should be able to see our app within the Google App's dialog window, either in a [sidebar](https://developers.google.com/apps-script/reference/base/ui?hl=en#showsidebaruserinterface) or modal [dialog window](https://developers.google.com/apps-script/reference/base/ui?hl=en#showmodaldialoguserinterface,-title).

2) However, since it is only running in an iframe, our local React app will not have access to any of the available [server-side functions](<https://developers.google.com/apps-script/guides/html/reference/run#myFunction(...)>). To fix this, we use the [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) to exchange messages between the top-level iframe and the React app development iframe, so that server-side calls will work during development.

To achieve this, the package takes advantage of Webpack Dev Server's ["iframe" mode](https://webpack.js.org/configuration/dev-server/#devserverinline). In "iframe" mode, a page is embedded in an iframe under a notification bar with messages about the build. The Webpack Dev Server source code has been modified in this repo to support being embedded in an iframe and pass messages from the top-level Google Apps Script environment down to the embedded React app and vice versa.

## Installing

This package exports a single HTML file as its main export. This file contains the full Webpack Dev Server "iframe" mode capabilities along with the ability to pass messages between the Google Apps Script environment and the locally served embedded app.

You can use this package like this:

1. Install the package.

   ```bash
   yarn add -D google-apps-script-webpack-dev-server
   ```

   ```bash
   npm install -D google-apps-script-webpack-dev-server
   ```

2. Modify your project's webpack config's [devServer](https://webpack.js.org/configuration/dev-server/) settings to use this package. Use webpack's [before](https://webpack.js.org/configuration/dev-server/#devserverbefore) configuration to load this custom dev server package.

   ```javascript
   const gasWebpackDevServerHtmlFilePath = require.resolve(
     'google-apps-script-webpack-dev-server'
   );

   module.exports = {
     //...
     devServer: {
       port: 3000,
       before: function (app, server, compiler) {
         app.get('/gas/*', (req, res) => {
           res.setHeader('Content-Type', 'text/html');
           createReadStream(gasWebpackDevServerHtmlFilePath).pipe(res);
         });
       },
     },
   };
   ```

   Note that we'll direct all traffic at `/gas/*` to our custom dev server package. We use the `/gas/` prefix so that this path doesn't clash with other files in the app that are served locally.

3. We need to create an app that loads an iframe that points to this custom dev server package we are serving. It also needs to send the proper messages using the `window.postMessage` API. See [React / Google Apps Script](https://github.com/enuchi/React-Google-Apps-Script) for examples (coming soon).

### The `postMessage` request body.

Embedded React apps must send a request object to the Dev Server (this package) that follows the following schema:

`type`: must be the string `'REQUEST'` \
`id`: a unique id string \
`functionName`: the name of the publicly exposed Google Apps function \
`args`: an array of arguments with which to call the publicly exposed Google Apps function

The request `targetOrigin` should be a full url that matches /^https?:\/\/localhost:\d+/ or /^https?:\/\/127.0.0.\d+/.

Example request:

```javascript
window.parent.postMessage(
  {
    type: 'REQUEST',
    id: '8f35f5d6-4ffc-4204-8042-4f9a586fc579',
    args: [],
    functionName: 'getData',
  },
  'https://localhost:3000'
);
```

### The `postMessage` response body.

Webpack Dev Server (this package) will receive requests through the `postMessage` API described above, and send a request to the parent, which should be a Google Scripts App in a dialog window that can trigger the actual server-side calls. The parent app should then send the response to this package using the following schema. This same schema will also be passed down to the embedded app untouched:

`type`: must be the string `'RESPONSE'`\
`id`: the unique id string that was sent in the request, for identification\
`status`: the string `'SUCCESS'` or `'ERROR'` depending on whether the Google Apps function call was successful\
`response`: the response from the Google Apps function if successful, or the error if not

Example response:

```javascript
{
  id: 'e309e66a-8208-4cc5-b6e7-0d8bad97af20';
  response: {
    rangeData: ['response', 'data'];
  }
  status: 'SUCCESS';
  type: 'RESPONSE';
}
```

The parent app sending requests "down" to the Dev Server app (this package) must have a domain matching /https:\/\/.+.googleusercontent.com\$/, for security.
