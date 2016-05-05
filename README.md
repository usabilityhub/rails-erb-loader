# erb loader

Simple `.erb` loader for use with Webpack in a Ruby on Rails project. Files are piped through the `ERB` via a `rails console` call on commandline (see source for more info).

```js
// webpack.config.js

module.exports = {
  preLoaders: [
    { test: /.erb$/, loader: '@usability-hub/erb-loader' },
  ]
};
```
