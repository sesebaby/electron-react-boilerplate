const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // 设置为开发模式以获取详细错误信息
  entry: './src/index.tsx',
  target: 'electron-renderer', // 改为 electron-renderer target
  devtool: 'source-map', // 启用source map以便调试
  node: {
    __dirname: false,
    __filename: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify"),
      "util": require.resolve("util/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "vm": false,
      "os": false,
      "zlib": false
    },
    alias: {
      // 修复 bcryptjs 的 process 依赖问题
      "process/browser": require.resolve("process/browser")
    }
  },
  externals: {
    // 排除 Node.js 原生模块，防止打包到浏览器代码中
    'sqlite3': 'commonjs sqlite3',
    'better-sqlite3': 'commonjs better-sqlite3',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'util': 'commonjs util',
    'crypto': 'commonjs crypto',
    'stream': 'commonjs stream',
    'buffer': 'commonjs buffer',
    'process': 'commonjs process',
    'os': 'commonjs os',
    'zlib': 'commonjs zlib'
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.DefinePlugin({
      global: 'globalThis',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
    hot: true,
  },
};