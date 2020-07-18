const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

const entry = 'src/live/index.js';
const destination = 'build';

module.exports = {
  name: 'Live Reload Frame',
  mode: 'production',
  entry: path.resolve(__dirname, entry),
  output: {
    path: path.resolve(__dirname, destination),
    filename: 'main.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|web_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.html$/,
        use: ['html-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    // keep the original webpack dev server config here
    new webpack.NormalModuleReplacementPlugin(
      /^\.\/clients\/SockJSClient$/,
      (resource) => {
        if (resource.context.startsWith(process.cwd())) {
          // eslint-disable-next-line no-param-reassign
          resource.request = resource.request.replace(
            /^\.\/clients\/SockJSClient$/,
            path.resolve(__dirname, 'src/clients/SockJSClient')
          );
        }
      }
    ),
    // embed all js and css inline
    new HtmlWebpackPlugin({
      inlineSource: '.(js|css)$',
    }),
    // see https://github.com/DustinJackson/html-webpack-inline-source-plugin/issues/63#issuecomment-515963062
    new HtmlWebpackInlineSourcePlugin(HtmlWebpackPlugin),
  ],
};
