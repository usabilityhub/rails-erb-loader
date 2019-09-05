"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var child_process_1 = require("child_process");
var path_1 = __importDefault(require("path"));
var loader_utils_1 = require("loader-utils");
var lodash_defaults_1 = __importDefault(require("lodash.defaults"));
function pushAll(dest, src) {
    Array.prototype.push.apply(dest, src);
}
/* Create a delimeter that is unlikely to appear in parsed code. I've split this
 * string deliberately in case this file accidentally ends up being transpiled
 */
var ioDelimiter = "_" + "_RAILS_ERB_LOADER_DELIMETER__";
/* Match any block comments that start with the string `rails-erb-loader-`. */
var configCommentRegex = /\/\*\s*rails-erb-loader-([a-z-]*)\s*([\s\S]*?)\s*\*\//g;
/* Absolute path to the Ruby script that does the ERB transformation. */
var runnerPath = path_1.default.join(__dirname, "erb_transformer.rb");
/* Takes a path and attaches `.rb` if it has no extension nor trailing slash. */
function defaultFileExtension(dependency) {
    return /((\.\w*)|\/)$/.test(dependency) ? dependency : dependency + ".rb";
}
/* Split the `runner` string into a `.file` and its `.arguments` */
function parseRunner(runner) {
    var runnerArguments = runner.split(" ");
    var runnerFile = runnerArguments.shift();
    if (runnerFile === undefined) {
        throw new Error("Invalid runner string: " + runner);
    }
    return { file: runnerFile, arguments: runnerArguments };
}
/* Get each space separated path, ignoring any empty strings. */
function parseDependenciesList(root, dependencies) {
    return dependencies
        .split(/\s+/)
        .reduce(function (accumulator, dependency) {
        if (dependency.length > 0) {
            var absolutePath = path_1.default.resolve(root, defaultFileExtension(dependency));
            accumulator.push(absolutePath);
        }
        return accumulator;
    }, []);
}
/* Update config object in place with comments from file */
function parseDependencies(source, root) {
    var dependencies = [];
    var match = null;
    while ((match = configCommentRegex.exec(source))) {
        var option = match[1];
        var value = match[2];
        switch (option) {
            case "dependency":
            case "dependencies":
                pushAll(dependencies, parseDependenciesList(root, value));
                break;
            default:
                console.warn("WARNING: Unrecognized configuration command " +
                    '"rails-erb-loader-' +
                    option +
                    '". Comment ignored.');
        }
    }
    return dependencies;
}
/* Launch Rails in a child process and run the `erb_transformer.rb` script to
 * output transformed source.
 */
function transformSource(runner, config, source, map, callback) {
    var callbackCalled = false;
    var child = child_process_1.spawn(runner.file, runner.arguments.concat(runnerPath, ioDelimiter, config.engine), {
        stdio: ["pipe", "pipe", process.stderr],
        env: config.env
    });
    var timeoutId = config.timeoutMs > 0
        ? setTimeout(function () {
            child.kill();
        }, config.timeoutMs)
        : -1;
    var dataBuffers = [];
    child.stdout.on("data", function (data) {
        dataBuffers.push(data);
    });
    // NOTE: From 'exit' event docs (assumed to apply to 'close' event)
    //
    // "If the process exited, code is the final exit code of the process,
    // otherwise null. If the process terminated due to receipt of a signal,
    // signal is the string name of the signal, otherwise null. One of the two
    // will always be non-null."
    //
    // see: https://nodejs.org/api/child_process.html#child_process_event_exit
    child.on("close", function (code, signal) {
        if (callbackCalled)
            return;
        if (code === 0) {
            // Output is delimited to filter out unwanted warnings or other output
            // that we don't want in our files.
            var sourceRegex = new RegExp(ioDelimiter + "([\\s\\S]+)" + ioDelimiter);
            var matches = Buffer.concat(dataBuffers)
                .toString()
                .match(sourceRegex);
            if (matches === null || matches.length === 0) {
                callback(new Error("Could not find transformed code"));
            }
            else {
                var transformedSource = matches && matches[1];
                if (timeoutId !== -1) {
                    clearTimeout(timeoutId);
                }
                callback(null, transformedSource, map);
            }
        }
        else if (child.killed) {
            // `child.killed` is true only if the process was killed by `ChildProcess#kill`,
            // ie. after a timeout.
            callback(new Error("rails-erb-loader took longer than the specified " +
                config.timeoutMs +
                "ms timeout"));
        }
        else if (signal !== null) {
            callback(new Error("rails-erb-loader was terminated with signal: " + signal));
        }
        else {
            callback(new Error("rails-erb-loader failed with code: " + code));
        }
        callbackCalled = true;
    });
    child.on("error", function (error) {
        if (callbackCalled)
            return;
        callback(error);
        callbackCalled = true;
    });
    child.stdin.on("error", function (error) {
        console.error('rails-erb-loader encountered an unexpected error while writing to stdin: "' +
            error.message +
            '". Please report this to the maintainers.');
    });
    child.stdin.write(source);
    child.stdin.end();
}
function addDependencies(loader, paths, callback) {
    var remaining = paths.length;
    if (remaining === 0)
        callback(null);
    paths.forEach(function (path) {
        fs_1.default.stat(path, function (error, stats) {
            if (error) {
                if (error.code === "ENOENT") {
                    callback(new Error('Could not find dependency "' + path + '"'));
                }
                else {
                    callback(error);
                }
            }
            else {
                if (stats.isFile()) {
                    loader.addDependency(path);
                }
                else if (stats.isDirectory()) {
                    loader.addContextDependency(path);
                }
                else {
                    console.warn("rails-erb-loader ignored dependency that was neither a file nor a directory");
                }
                remaining--;
                if (remaining === 0)
                    callback(null);
            }
        });
    });
}
var railsErbLoader = function (sourceStringOrBuffer, map) {
    var source = sourceStringOrBuffer.toString();
    // Mark loader cacheable. Must be called explicitly in webpack 1.
    // see: https://webpack.js.org/guides/migrating/#cacheable
    this.cacheable();
    // Get options passed in the loader query, or use defaults.
    // Modifying the return value of `getOptions` is not permitted.
    var config = lodash_defaults_1.default({}, loader_utils_1.getOptions(this), {
        dependenciesRoot: "app",
        runner: "./bin/rails runner",
        engine: "erb",
        env: process.env,
        timeoutMs: 0
    });
    // Dependencies are only useful in development, so don't bother searching the
    // file for them otherwise.
    var dependencies = process.env.NODE_ENV === "development"
        ? parseDependencies(source, config.dependenciesRoot)
        : [];
    // Parse the runner string before passing it down to `transfromSource`
    var runner = parseRunner(config.runner);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    var callback = this.async();
    // Register watchers for any dependencies.
    addDependencies(this, dependencies, function (error) {
        if (error !== null) {
            callback(error);
        }
        else {
            transformSource(runner, config, source, map, callback);
        }
    });
};
module.exports = railsErbLoader;
