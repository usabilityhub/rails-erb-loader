# ERB loader

Simple `.erb` loader for use with Webpack in a Ruby on Rails project. Files are piped through the `ERB` via a `rails runner` call on commandline (see source for more info).

## Installation

Install from npm

```bash
$ npm install uh-erb-loader --save-dev
```

## Example Webpack config

```js
// webpack.config.js

module.exports = {
  preLoaders: [
    { test: /.erb$/, loader: 'uh-erb-loader' },
  ]
};
```
