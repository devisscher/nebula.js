const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const babelPath = require.resolve('babel-loader');
const babelPresetEnvPath = require.resolve('@babel/preset-env');
const babelPresetReactPath = require.resolve('@babel/preset-react');
const sourceMapLoaderPath = require.resolve('source-map-loader');

const cfg = ({ srcDir, distDir, snPath, dev = false }) => {
  const config = {
    mode: dev ? 'development' : 'production',
    entry: {
      eRender: [path.resolve(srcDir, 'eRender')],
      eDev: [path.resolve(srcDir, 'eDev')],
      eHub: [path.resolve(srcDir, 'eHub')],
    },
    devtool: 'source-map',
    output: {
      path: distDir,
      filename: '[name].js',
    },
    resolve: {
      alias: {
        snDefinition: snPath,
        ...(dev
          ? {
              // For local nebula.js development use aliasing to be able to debug nucleus / supernova
              '@nebula.js/nucleus/src/hooks': path.resolve(process.cwd(), 'apis/nucleus/src/hooks'),
              '@nebula.js/nucleus/src/object': path.resolve(process.cwd(), 'apis/nucleus/src/object'),
              '@nebula.js/nucleus': path.resolve(process.cwd(), 'apis/nucleus/src'),
              '@nebula.js/supernova': path.resolve(process.cwd(), 'apis/supernova/src'),
            }
          : {}),
      },
      extensions: ['.js', '.jsx'],
    },
    externals: dev ? {} : 'snDefinition',
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js?$/,
          loader: sourceMapLoaderPath,
        },
        {
          test: /\.jsx?$/,
          sideEffects: false,
          include: [srcDir, /nucleus/, /ui\/icons/],
          use: {
            loader: babelPath,
            options: {
              presets: [
                [
                  babelPresetEnvPath,
                  {
                    modules: false,
                    targets: {
                      browsers: ['last 2 chrome versions'],
                    },
                  },
                ],
                babelPresetReactPath,
              ],
            },
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(srcDir, 'eRender.html'),
        filename: 'eRender.html',
        chunks: ['eRender'],
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(srcDir, 'eDev.html'),
        filename: 'eDev.html',
        chunks: ['eDev'],
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(srcDir, 'eHub.html'),
        filename: 'eHub.html',
        chunks: ['eHub'],
      }),
    ],
  };

  return config;
};

if (!process.env.DEFAULTS) {
  module.exports = cfg;
} else {
  module.exports = cfg({
    srcDir: path.resolve(__dirname, '../web'),
    distDir: path.resolve(__dirname, '../dist'),
    snPath: path.resolve(__dirname, 'placeholder'),
    dev: false,
  });
}
