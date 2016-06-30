// TODO: split functionality to building, completion notifying
// and watching. With support of production builds without watches
// and reload handlers.
// Make all functionality available via API instead of running
// a process. Make possibility to supply resulting bundle
// in memory instead of thru a file.
// Separate index.html bundling from core bundling,
// allow externalize that functionality
// (but support thru specifying source map offset -
// position of JavaScript <script> code in HTML).
// Remove reloading support into example, but make use
// of API.
// Use caching to prevent re-reading of files if nothing changed,
// only track changed files.
// Build and include in bundled map the source map for the
// browser require script require-script.js.

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

var depsTree = require('./lib/deps-tree');

var browserRequireScript = fs.readFileSync(__dirname + '/browser-scripts/require-script.js');

var watcher = chokidar.watch([], {persistent: true})
  .on('change', buildAll)
  .on('unlink', buildAll)


var watchFileList = [];

var promiseRef = undefined;

var g_ws = undefined;

function buildAll () {
  console.log('Rebuilding...');
  watcher.unwatch(watchFileList);

  depsTree(entryPath)
    .then(function (deps) {


      build(deps);

      if (g_ws) {
        g_ws.send('reload');
      }

      console.log('Rebuild complete.');

      watcher.add(deps.files);
      watchFileList = deps.files;
    })
    .catch(function (err) {
      console.log('Error', err);
    });
}

buildAll();

function build (deps) {


var source = fs.readFileSync(entryPath, 'utf-8');

var sourceMap = combineSourceMap.create();

function lineBreakCount (str){
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

combinedHtml += browserRequireScript;

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

