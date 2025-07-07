const devConfig = require('./webpack.dev.config.js');
const webpack = require('webpack');

// 继承并修改dev配置
const testConfig = {
  ...devConfig,
  plugins: [
    ...(devConfig.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ],
};

module.exports = testConfig; 