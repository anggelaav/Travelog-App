const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'src/scripts/index.js'),
    sw: path.resolve(__dirname, 'src/scripts/sw.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      favicon: path.resolve(__dirname, 'src/public/favicon.png'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/public/'),
          to: path.resolve(__dirname, 'dist/'),
          globOptions: {
            ignore: ['**/index.html']
          }
        },
        {
          from: path.resolve(__dirname, "src/scripts/sw.js"),
          to: path.resolve(__dirname, "dist/sw.js"),
        },
        {
          from: path.resolve(__dirname, 'src/manifest.json'),
          to: path.resolve(__dirname, 'dist/')
        },
        {
          from: path.resolve(__dirname, 'src/public/images/icons/'),
          to: path.resolve(__dirname, 'dist/images/icons/')
        },
        {
          from: path.resolve(__dirname, 'src/public/images/screenshots/'),
          to: path.resolve(__dirname, 'dist/images/screenshots/')
        },
        {
          from: path.resolve(__dirname, 'src/public/favicon.png'),
          to: path.resolve(__dirname, 'dist/favicon.png')
        }
      ],
    }),
  ],
};