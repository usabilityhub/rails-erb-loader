import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { getOptions } from "loader-utils";
import defaults from "lodash.defaults";
import { loader } from "webpack";
import { RawSourceMap } from "../node_modules/@types/uglify-js/node_modules/source-map/source-map";

interface Config {
  readonly dependenciesRoot: string;
  readonly runner: string;
  readonly engine: "erb" | "erubi" | "erubis";
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
}

interface Runner {
  readonly file: string;
  readonly arguments: readonly string[];
}

function pushAll<T>(dest: T[], src: T[]): void {
  Array.prototype.push.apply(dest, src);
}

/* Create a delimeter that is unlikely to appear in parsed code. I've split this
 * string deliberately in case this file accidentally ends up being transpiled
 */
const ioDelimiter = "_" + "_RAILS_ERB_LOADER_DELIMETER__";

/* Match any block comments that start with the string `rails-erb-loader-`. */
const configCommentRegex = /\/\*\s*rails-erb-loader-([a-z-]*)\s*([\s\S]*?)\s*\*\//g;

/* Absolute path to the Ruby script that does the ERB transformation. */
const runnerPath = path.join(__dirname, "..", "erb_transformer.rb");

/* Takes a path and attaches `.rb` if it has no extension nor trailing slash. */
function defaultFileExtension(dependency: string): string {
  return /((\.\w*)|\/)$/.test(dependency) ? dependency : dependency + ".rb";
}

/* Split the `runner` string into a `.file` and its `.arguments` */
function parseRunner(runner: string): Runner {
  const runnerArguments = runner.split(" ");
  const runnerFile = runnerArguments.shift();
  if (runnerFile === undefined) {
    throw new Error(`Invalid runner string: ${runner}`);
  }
  return { file: runnerFile, arguments: runnerArguments };
}

/* Get each space separated path, ignoring any empty strings. */
function parseDependenciesList(root: string, dependencies: string): string[] {
  return dependencies
    .split(/\s+/)
    .reduce<string[]>((accumulator, dependency) => {
      if (dependency.length > 0) {
        const absolutePath = path.resolve(
          root,
          defaultFileExtension(dependency)
        );
        accumulator.push(absolutePath);
      }
      return accumulator;
    }, []);
}

/* Update config object in place with comments from file */
function parseDependencies(source: string, root: string): string[] {
  const dependencies: string[] = [];
  let match = null;
  while ((match = configCommentRegex.exec(source))) {
    const option = match[1];
    const value = match[2];
    switch (option) {
      case "dependency":
      case "dependencies":
        pushAll(dependencies, parseDependenciesList(root, value));
        break;
      default:
        console.warn(
          "WARNING: Unrecognized configuration command " +
            '"rails-erb-loader-' +
            option +
            '". Comment ignored.'
        );
    }
  }
  return dependencies;
}

/* Launch Rails in a child process and run the `erb_transformer.rb` script to
 * output transformed source.
 */
function transformSource(
  runner: Runner,
  config: Config,
  source: string,
  map: RawSourceMap | undefined,
  callback: (
    error: Error | null,
    transformedSource?: string,
    map?: RawSourceMap | undefined
  ) => void
): void {
  let callbackCalled = false;
  const child = spawn(
    runner.file,
    runner.arguments.concat(runnerPath, ioDelimiter, config.engine),
    {
      stdio: ["pipe", "pipe", process.stderr],
      env: config.env
    }
  );
  const timeoutId =
    config.timeoutMs > 0
      ? setTimeout(() => {
          child.kill();
        }, config.timeoutMs)
      : -1;

  const dataBuffers: Uint8Array[] = [];
  child.stdout.on("data", (data: Uint8Array) => {
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
  child.on("close", (code: number, signal: string | null) => {
    if (callbackCalled) return;

    if (code === 0) {
      // Output is delimited to filter out unwanted warnings or other output
      // that we don't want in our files.
      const sourceRegex = new RegExp(ioDelimiter + "([\\s\\S]+)" + ioDelimiter);
      const output = Buffer.concat(dataBuffers).toString()
      const matches = output.match(sourceRegex);
      if (matches === null || matches.length === 0) {
        callback(new Error("Could not find transformed code"));
      } else {
        const transformedSource = matches && matches[1];
        if (timeoutId !== -1) {
          clearTimeout(timeoutId);
        }
        callback(null, transformedSource, map);
      }
    } else if (child.killed) {
      // `child.killed` is true only if the process was killed by `ChildProcess#kill`,
      // ie. after a timeout.
      callback(
        new Error(
          "rails-erb-loader took longer than the specified " +
            config.timeoutMs +
            "ms timeout"
        )
      );
    } else if (signal !== null) {
      callback(
        new Error("rails-erb-loader was terminated with signal: " + signal)
      );
    } else {
      callback(new Error("rails-erb-loader failed with code: " + code));
    }

    callbackCalled = true;
  });

  child.on("error", (error: Error) => {
    if (callbackCalled) return;
    callback(error);
    callbackCalled = true;
  });
  child.stdin.on("error", (error: Error) => {
    console.error(
      'rails-erb-loader encountered an unexpected error while writing to stdin: "' +
        error.message +
        '". Please report this to the maintainers.'
    );
  });
  child.stdin.write(source);
  child.stdin.end();
}

function addDependencies(
  loader: loader.LoaderContext,
  paths: readonly string[],
  callback: (error: Error | null) => void
): void {
  let remaining = paths.length;

  if (remaining === 0) callback(null);

  paths.forEach(path => {
    fs.stat(path, function(error, stats) {
      if (error) {
        if (error.code === "ENOENT") {
          callback(new Error('Could not find dependency "' + path + '"'));
        } else {
          callback(error);
        }
      } else {
        if (stats.isFile()) {
          loader.addDependency(path);
        } else if (stats.isDirectory()) {
          loader.addContextDependency(path);
        } else {
          console.warn(
            "rails-erb-loader ignored dependency that was neither a file nor a directory"
          );
        }
        remaining--;
        if (remaining === 0) callback(null);
      }
    });
  });
}

const railsErbLoader: loader.Loader = function(sourceStringOrBuffer, map) {
  const source = sourceStringOrBuffer.toString();

  // Mark loader cacheable. Must be called explicitly in webpack 1.
  // see: https://webpack.js.org/guides/migrating/#cacheable
  this.cacheable();

  // Get options passed in the loader query, or use defaults.
  // Modifying the return value of `getOptions` is not permitted.
  const config: Config = defaults({}, getOptions(this) as Partial<Config>, {
    dependenciesRoot: "app",
    runner: "./bin/rails runner",
    engine: "erb" as const,
    env: process.env,
    timeoutMs: 0
  });

  // Dependencies are only useful in development, so don't bother searching the
  // file for them otherwise.
  const dependencies =
    process.env.NODE_ENV === "development"
      ? parseDependencies(source, config.dependenciesRoot)
      : [];

  // Parse the runner string before passing it down to `transfromSource`
  const runner = parseRunner(config.runner);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const callback = this.async()!;

  // Register watchers for any dependencies.
  addDependencies(this, dependencies, (error: Error | null) => {
    if (error !== null) {
      callback(error);
    } else {
      transformSource(runner, config, source, map, callback);
    }
  });
};

module.exports = railsErbLoader;
