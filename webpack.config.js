// webpack.config.js

var webpack = require('webpack');
var path = require('path');
var libraryName = 'zimbra-admin-api';
var outputFile = libraryName + '.js';
var DEV = false;

const NPM_TARGET = process.env.npm_lifecycle_event; //eslint-disable-line no-process-env

if (NPM_TARGET === 'run' || NPM_TARGET === 'run-fullmap') {
    DEV = true;
    if (NPM_TARGET === 'run-fullmap') {
        FULLMAP = true;
    }
}

var config = {
  entry: ['./src/index.js'],
  devtool: 'source-map',
  output: {
    path: __dirname + '/lib',
    filename: outputFile,
    library: 'ZimbraAdminApi',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /\.(js|jsx)?$/,
        loader: 'babel',
        exclude: /(node_modules)/,
        query: {
          presets: ['es2015'],
          plugins: ['transform-runtime'],
          cacheDirectory: DEV
        }
      },
      {
        test: /\.json$/,
        loader: 'json'
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: "eslint-loader",
        exclude: /node_modules/
      },
      {
        test: /(node_modules)\/.+\.(js|jsx)$/,
        loader: 'imports'
      }
    ]
  },
  resolve: {
    root: path.resolve('./src'),
    extensions: ['', '.js']
  }
};

module.exports = config;
