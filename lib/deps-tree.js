// This module wraps around module-deps
// streams and instead of piping returns
// whole result in a promise.
var Stream = require('stream');
var mdeps = require('module-deps');
var JSONStream = require('JSONStream');
var depsSort = require('deps-topo-sort');
var bresolve = require('browser-resolve');

// TODO 1: implement caching.
// module-deps allows to use a lot of pre-cache options.
// TODO 2: use stream instead of promise.
// it allows more efficient processing raising speed,
// lowering memory consumption but hard-to-understand
// not imperative code.
module.exports = function depsTree (startingFile, opts, onDependency, onComplete, onError) {

  var deps = {
    order: [],
    deps: {},
    files: []
  };

  var num = 0;

  var ws = new Stream;
  ws.writable = true;
  ws.bytes = 0;

  //console.log(opts.packageCache);
  var pkgCache = opts.packageCache || {};

  ws.write = function writeDependency (dep) {
    // console.log(dep);
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

    // console.log(md.fileCache);

    onComplete(deps, {cache: md.cache,
      packageCache: md.pkgCache, fileCache: md.fileCache});
  }

  // opts = {cache: {'a': {source: 'a', package: {}, deps: {}}}};
  // console.log(opts.cache);
  

  opts.resolve = function resolve (id, parent, cb) {
      function cbWrap (err, path, pkg) {
        pkgCache[path] = pkg;
        // console.log(path, pkg.__dirname);
        if (err) {
          console.log(parent.filename, err.message);
          deps.files.push(parent.filename);
        }
        return cb(err, path, pkg);
      }
      return bresolve(id, parent, cbWrap);
      };

  var md = mdeps(opts);

  md.on('package', function onPackage (package) {
    // console.log(package.__dirname);
  });

  md.on('file', function onPackage (file, id) {
    // console.log(file, id);
  });

  md.on('error', function onError (error) {
    // console.log(error.message, error.filename);
    onComplete(deps, {});
  });

  md
    .pipe(depsSort())
    .pipe(ws);
  md.end({ file: startingFile });
};

