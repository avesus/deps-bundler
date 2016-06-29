var argv = require('optimist').argv;

if (!argv.entry) {
  console.log('usage: bla --entry index.js');
  process.exit(0);
}

var entryPath = process.cwd() + '/' + argv.entry;

var path = require('path');
var chokidar = require('chokidar');
var combineSourceMap = require('combine-source-map');
var fs = require('fs');

var depsTree = require('./lib/depsTree');

var watcher = chokidar.watch([], {persistent: true})
  .on('change', buildAll)
  .on('unlink', buildAll)


var watchFileList = [];

var promiseRef = undefined;

var g_ws = undefined;

function buildAll () {
  console.log('Rebuilding...');

  depsTree(entryPath)
    .then(function (deps) {

      watcher.unwatch(watchFileList);
      watcher.add(deps.files);
      watchFileList = deps.files;

      build(deps);

      if (g_ws) {
        g_ws.send('reload');
      }

      console.log('Rebuild complete.');
    })
    .catch(function (err) {
      console.log('Error', err);
    });
}

buildAll();

function build (deps) {


var source = fs.readFileSync(entryPath, 'utf-8');

var sourceMap = combineSourceMap.create();

function lineBreakCount(str){
	/* counts \n */
	try {
		return((str.match(/[^\n]*\n[^\n]*/gi).length));
	} catch(e) {
		return 0;
	}
}

var combinedHtml = '<html><head><script>var modulesInfo = {\n';

function addFile (depsData, sinceLine) {
  var linesAdded = 0;

  sourceMap.addFile({ sourceFile: depsData.file, source: depsData.source },
    { line: sinceLine + 1 });

  var source = depsData.source.substring(0, depsData.source.lastIndexOf("\n"));

  linesAdded += lineBreakCount(source);
  combinedHtml += "'" + depsData.file + "': [" + JSON.stringify(depsData.deps) +
    ", function (exports, require, module, __filename, __dirname) {\n";
  combinedHtml += source;
  combinedHtml += "\n}],\n";

  return linesAdded + 3;
}


var sinceLine = 1;

for (var fileIndex = 0; fileIndex < deps.order.length; ++fileIndex) {
  console.log(sinceLine + 2);
  sinceLine += addFile(deps.deps[deps.order[fileIndex]], sinceLine);
}

combinedHtml += "};\n";

combinedHtml += "var modules = {};\
\
  function regModule (path, loader, deps) {\
    modules[path] = {\
      module: {\
        filename: path,\
        exports: {}\
      },\
      loader: loader,\
      deps: deps\
    };\
  }\
\
  function loadModule (resolvedFullPath) {\
    var moduleDesc = modules[resolvedFullPath];\
    var module = moduleDesc.module;\
    if (!module.loaded && !module._loading) {\
      module._loading = true;\
      moduleDesc.loader(module.exports,\
        function require (modulePath) {\
          var resolvedFullPath = moduleDesc.deps[modulePath];\
          if (resolvedFullPath) {\
            return loadModule(resolvedFullPath);\
          } else {\
            throw('Builtin modules are unsupported or path not found');\
          }\
        },\
        module, module.filename);\
\
      module._loading = false;\
      module.loaded = true;\
    }\
\
    return module.exports;\
  }\
\
  Object.keys(modulesInfo).forEach(function(modulePath) {\
    var moduleInfo = modulesInfo[modulePath];\
    regModule(modulePath, moduleInfo[1], moduleInfo[0]);\
  });";


console.log(sinceLine);

fs.writeFileSync('./index.html', combinedHtml + '\n' + sourceMap.comment() + '</script><style>' +
  // fs.readFileSync('./qp.css', 'utf-8') + 
  '</style></head><body><div id="container"></div><script>' +
  "document.body.onload = function () { loadModule('" + entryPath + "');};" +
  '</script></body></html>', 'utf-8');
}





var ws = require('ws');

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log('Debugging browser connected.');

  g_ws = ws;

  ws.send('something');
});

