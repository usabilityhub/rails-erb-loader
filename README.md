# rails-erb-loader

[![npm version](https://img.shields.io/npm/v/rails-erb-loader.svg?style=flat-square)](https://www.npmjs.com/package/rails-erb-loader)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Embedded Ruby (`.erb`) `webpack` loader for Ruby projects.

Compiles Embedded Ruby template files in any Ruby project. Files are built using either the `Erubis` or `ERB` gem.

**NOTE:** For compatibility with webpack 1, please use [version 3.2.0](https://github.com/usabilityhub/rails-erb-loader/tree/3.2.0).

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

Add `rails-erb-loader` to your rules.

```js
// webpack.config.js

module.exports = {
    module: {
      rules: [
        {
          test: /\.erb$/,
          enforce: 'pre',
          loader: 'rails-erb-loader'
        },
      ]
    }
  }
};
```

Now you can use `.erb` files in your project, for example:

`app/assets/javascripts/UserFormFields.jsx.erb`
```erb
/* rails-erb-loader-dependencies models/user models/image */

export default function UserFormFields() {
  return (
    <div>
      <label htmlFor='avatar'>
        Avatar
      </label>
      <ImageField id='avatar' maxSize={<%= Image::MAX_SIZE %>} />
      <label htmlFor='name'>
        Name
      </label>
      <input
        id='name'
        type='text'
        maxLength={<%= User::MAX_NAME_LENGTH %>}
      />
      <label htmlFor='age'>
        Age
      </label>
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

## Configuration

### Query parameters

Can be configured with [query parameters](https://webpack.github.io/docs/using-loaders.html#query-parameters):

| Option | Default | Description |
| ------ | ------- | ----------- |
| `dependenciesRoot` | `"app"` | The root of your Rails project, relative to `webpack`'s working directory. |
| `engine` | `"erubis"` | ERB Template engine, `"erubis"` and `"erb"` are supported right now. |
| `parseComments` | `true` | Search files for [configuration comments](#configuration-comments) before compiling. |
| `runner` | `"./bin/rails runner"` | Command to run Ruby scripts, relative to `webpack`'s working directory. |

These options may also be specified directly in your `webpack` config. For example, if your `webpack` process is running in a subdirectory of your Rails project:

```js
{
  test: /\.erb$/,
  loader: 'rails-erb-loader',
  options: {
    runner: '../bin/rails runner',
    dependenciesRoot: '../app',
  }
}
```

Also supports building without Rails:

```js
{
  test: /\.erb$/,
  loader: 'rails-erb-loader',
  options: {
    runner: 'ruby',
    engine: 'erb'
  }
}
```

### Dependencies

If your `.erb` files depend on files in your Ruby project, you can list them explicitly. Inclusion of the `rails-erb-loader-dependency` (or `-dependencies`) comment will tell `webpack` to watch these files - causing webpack-dev-server to rebuild when they are changed.

#### Watch individual files

List dependencies in the comment. `.rb` extension is optional.

```js
/* rails-erb-loader-dependencies models/account models/user */
```

#### Watch a whole directory

To watch all files in a directory, end the path in a `/`.

```js
/* rails-erb-loader-dependencies ../config/locales/ */
```

## Contribute

Questions, bug reports and pull requests welcome. See [GitHub issues](https://github.com/usabilityhub/rails-erb-loader/issues).

## License

MIT
