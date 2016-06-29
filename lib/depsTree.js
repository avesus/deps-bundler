var Stream = require('stream');
var Promise = require('bluebird');
var mdeps = require('module-deps');
var JSONStream = require('JSONStream');
var depsSort = require('deps-topo-sort');

module.exports = function depsTree (fromPath) {

  return new Promise(function (resolve) {
    var deps = {
      order: [],
      deps: {},
      files: []
    };

    var num = 0;

    var ws = new Stream;
    ws.writable = true;
    ws.bytes = 0;

    ws.write = function(obj) {
      deps.order.push(obj.id);
      deps.deps[obj.id] = obj;
      deps.deps[obj.id].order = num++;
      deps.files.push(obj.file);
    }

    ws.end = function(buf) {
      if (buf) {
        ws.write(buf);
      }

      ws.writable = false;
      resolve(deps);
    }

    var md = mdeps();
    md.pipe(depsSort()).pipe(ws);
    md.end({ file: fromPath });
  });
};

