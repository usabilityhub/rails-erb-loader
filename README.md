# uh-erb-loader

[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Embedded Ruby (`.erb`) Webpack loader for Ruby on Rails projects.

Compiles Embedded Ruby template files in a Rails project. Files are piped through the `ERB` gem via a call to `rails runner`.

## Install

Install from npm

```console
$ npm install uh-erb-loader --save-dev
```

## Usage

Add `uh-erb-loader` to your preloaders.

```js
// webpack.config.js

module.exports = {
  preLoaders: [
    { test: /\.erb$/, loader: 'uh-erb-loader' },
  ]
};
```

## Configuration

Can be configured with [query parameters](https://webpack.github.io/docs/using-loaders.html#query-parameters):

| Option | Default | Description |
| ------ | ------- | ----------- |
| `cacheable` | `false` | Should this file be cached? If `false` files will recompiled on every build. Files that have [configuration comments](#dependencies) will always be cached. |
| `dependenciesRoot` | `"app"` | The root of your Rails project, relative to Webpack's working directory. |
| `parseComments` | `true` | Search files for configuration comments before compiling. |

## Dependencies

Building many `.erb` files can be slow. It is best to be avoided when unnecessary. You can speed up rebuild by whitelisting dependencies from your Rails project.

For example, consider the following React component that reads data from the `User` and `Image` Ruby classes:

```erb
// app/assets/javascripts/UserFormFields.js

/* uh-erb-loader-dependencies models/user models/image */

export default function UserFormFields() {
  return (
    <div>
      <label>Avatar</label>
      <ImageField maxSize={<%= Image::MAX_SIZE %>} />
      <input
        id='name'
        type='text'
        maxLength={<%= User::MAX_NAME_LENGTH %>}
      />
      <label htmlFor='name'>Name</label>
      <input
        id='name'
        type='text'
        maxLength={<%= User::MAX_NAME_LENGTH %>}
      />
      <label htmlFor='age'>Age</label>
      <input
        id='age'
        type='number'
        min={<%= User::MIN_AGE %>}
        max={<%= User::MAX_AGE %>}
      />
    </div>
  )
}
```

Inclusion of the `uh-erb-loader-dependency` (or `-dependencies`) comment will tell Webpack to cache the file until any of the listed dependencies are modified.

## Contribute

Questions, bug reports and pull requests welcome. See [GitHub issues](https://github.com/usabilityhub/uh-erb-loader/issues).

## License

MIT
