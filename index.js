var exec = require('child_process').exec
var path = require('path')
var uuid = require('node-uuid')
var loaderUtils = require('loader-utils')
var defaults = require('lodash.defaults')

/* Match any block comments that start with the string `uh-erb-loader-*`. */
var configCommentRegex = /\/\*\s*uh-erb-loader-([a-z-]*)\s*([\s\S]*?)\s*\*\//g

/* Match any path ending with a file extension */
var fileExtensionRegex = /\.\w*$/

/* Takes a path and attaches `.rb` if it does not already have an extension. */
function defaultFileExtension (dependency) {
  return fileExtensionRegex.test(dependency) ? dependency : dependency + '.rb'
}

/* Get a list of all dependencies listed in `dependencies` comments. */
function getDependencies (source, root) {
  var match = null
  var dependencies = []
  while ((match = configCommentRegex.exec(source))) {
    var option = match[1]
    var value = match[2]
    if (option === 'dependency' || option === 'dependencies') {
      // Get each space separated path, ignoring any empty strings.
      value.split(/\s+/).forEach(function (dependency) {
        if (dependency.length > 0) {
          var absolutePath = path.resolve(root, defaultFileExtension(dependency))
          dependencies.push(absolutePath)
        }
      })
    } else {
      console.warn(
        'WARNING: Unrecognized configuration command ' +
        '"uh-erb-loader-' + option + '". Comment ignored.'
      )
    }
  }
  return dependencies
}

/* Launch Rails in a child process and run the `erb_transformer.rb` script to
 * output transformed source.
 */
function transformSource (source, map, callback) {
  var ioDelimiter = uuid.v4()
  var child = exec(
    './bin/rails runner ' + path.join(__dirname, 'erb_transformer.rb') + ' ' + ioDelimiter,
    function (error, stdout) {
      // Output is delimited to filter out unwanted warnings or other output
      // that we don't want in our files.
      var sourceRegex = new RegExp(ioDelimiter + '([\\s\\S]+)' + ioDelimiter)
      var matches = stdout.match(sourceRegex)
      var transformedSource = matches && matches[1]
      callback(error, transformedSource, map)
    }
  )
  child.stdin.write(source)
  child.stdin.end()
}

module.exports = function uhErbLoader (source, map) {
  var loader = this

  // Get options passed in the loader query, or use defaults.
  var config = defaults(loaderUtils.getLoaderConfig(loader, 'uhErbLoader'), {
    cacheable: false,
    dependenciesRoot: 'app',
    parseComments: true
  })

  // If `parseComments` is enabled then search the files for dependency
  // commands.
  var dependencies = config.parseComments
    ? getDependencies(source, config.dependenciesRoot)
    : []

  if (dependencies.length > 0) {
    // Automatically enable caching if any dependencies are found, and register
    // them all with Webpack...
    loader.cacheable()
    dependencies.forEach(function (dependency) {
      loader.addDependency(dependency)
    })
  } else if (config.cacheable) {
    // ...Otherwise use the default `cacheable` setting.
    loader.cacheable()
  }
  // Now actually transform the source.
  var callback = loader.async()
  transformSource(source, map, callback)
}
