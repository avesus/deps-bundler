// This module wraps around module-deps
// streams and instead of piping returns
// whole result in a promise.
var Stream = require('stream');
var mdeps = require('module-deps');
var JSONStream = require('JSONStream');
var depsSort = require('deps-topo-sort');

// TODO 1: implement caching.
// module-deps allows to use a lot of pre-cache options.
// TODO 2: use stream instead of promise.
// it allows more efficient processing raising speed,
// lowering memory consumption but hard-to-understand
// not imperative code.
module.exports = function depsTree (startingFile, onDependency, onComplete, onError) {

  var deps = {
    order: [],
    deps: {},
    files: []
  };

  var num = 0;

  var ws = new Stream;
  ws.writable = true;
  ws.bytes = 0;

  ws.write = function writeDependency (dep) {
    deps.order.push(dep.id);
    deps.deps[dep.id] = dep;
    deps.deps[dep.id].order = num++;
    deps.files.push(dep.file);
    onDependency(dep);
  }

  ws.end = function (dep) {
    if (dep) {
      ws.write(dep);
    }

    ws.writable = false;
    onComplete(deps);
  }

  var md = mdeps();
  md.pipe(depsSort()).pipe(ws);
  md.end({ file: startingFile });
};

