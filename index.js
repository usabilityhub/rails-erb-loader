var exec = require('child_process').exec;

module.exports = function(source, map) {

  var callback = this.async();

  var child = exec(
    "./bin/rails runner 'require \"erb\"; puts ERB.new(STDIN.read).result()'",
    function(error, result) {
      callback(error, result, map);
    }
  );

  child.stdin.write(source);
  child.stdin.end();
}
