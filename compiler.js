var MemoryFS = require('memory-fs')
var webpack = require('webpack')
var defaults = require('lodash.defaults')
var path = require('path')

var isWebpack4 = webpack.version && webpack.version.slice(0, 1) === '4'

function webpack3Compiler (config) {
  return webpack({
    entry: './test/erb/' + config.file,
    module: {
      loaders: [
        {
          test: /\.erb$/,
          loader: './index',
          options: defaults({}, config, {
            dependenciesRoot: './test/dependencies',
            timeoutMs: 2000
          })
        }
      ]
    },
    output: {
      filename: './output.js'
    }
  })
}

function webpack4Compiler (config) {
  return webpack({
    entry: './test/erb/' + config.file,
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.erb$/,
          loader: './index',
          options: defaults({}, config, {
            dependenciesRoot: './test/dependencies',
            timeoutMs: 2000
          })
        }
      ]
    },
    output: {
      path: __dirname,
      filename: 'output.js'
    }
  })
}

var webpackCompiler = isWebpack4 ? webpack4Compiler : webpack3Compiler

var fs = new MemoryFS()

function compile (config, callback) {
  config.runner = config.runner || 'ruby'
  config.engine = config.engine || 'erb'

  var compiler = webpackCompiler(config)
  compiler.outputFileSystem = fs
  compiler.run(callback)
}

function readOutput () {
  var fileContent = fs.readFileSync(path.resolve(__dirname, './output.js'))
  return fileContent.toString()
}

exports.compile = compile
exports.readOutput = readOutput
