# rails-erb-loader

[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Embedded Ruby (`.erb`) Webpack loader for Ruby on Rails projects.

Compiles Embedded Ruby template files in a Rails project. Files are piped through the `Erubis` gem via a call to `rails runner`.

## Table of Contents
- [Install](#install)
- [Usage](#usage)
- [Configuration](#configuration)
  - [Query parameters](#query-parameters)
  - [Configuration comments](#configuration-comments)
- [Contribute](#contribute)
- [License](#license)

## Install

Install from npm

```console
$ npm install rails-erb-loader --save-dev
```

## Usage

Add `rails-erb-loader` to your preloaders.

```js
// webpack.config.js

module.exports = {
  preLoaders: [
    { test: /\.erb$/, loader: 'rails-erb-loader' },
  ]
};
```

## Configuration

### Query parameters

Can be configured with [query parameters](https://webpack.github.io/docs/using-loaders.html#query-parameters):

| Option | Default | Description |
| ------ | ------- | ----------- |
| `cacheable` | `true` | If `false`, then files are rebuilt every time WebPack rebuilds. If `true`, files will only be rebuilt when they or their dependencies are modified. |
| `dependencies` | `[]` | A list of Ruby files to watch for changes. |
| `dependenciesRoot` | `"app"` | The root of your Rails project, relative to Webpack's working directory. |
| `parseComments` | `true` | Search files for [configuration comments](#configuration-comments) before compiling. |

### Configuration comments

`rails-erb-loader` will parse files for overrides to query parameters. These must be `/* ... */` style block comments starting with the correct `rails-erb-loader-*` command. This comment syntax is supported in JavaScript, CSS, SASS and less.

#### `rails-erb-loader-cacheable`

Override `cacheable` config for just this file.

```js
/* rails-erb-loader-cacheable true */
export const VALUE = <%= 5 %>
```

#### `rails-erb-loader-dependencies`

Building many `.erb` files can be slow. It is best to be avoided when unnecessary. You can speed up rebuild by whitelisting dependencies from your Rails project.

For example, consider the following React component that reads data from the `User` and `Image` Ruby classes:

```erb
// app/assets/javascripts/UserFormFields.js

/* rails-erb-loader-dependencies models/user models/image */

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

Inclusion of the `rails-erb-loader-dependency` (or `-dependencies`) comment will tell Webpack to cache the file until any of the listed dependencies are modified.

## Contribute

Questions, bug reports and pull requests welcome. See [GitHub issues](https://github.com/usabilityhub/rails-erb-loader/issues).

## License

MIT
