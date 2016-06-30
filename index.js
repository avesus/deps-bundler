// TODO: split functionality to building, completion notifying and watching.
//
// With support of production builds without watches and reload handlers.
//
// Make all functionality available via API instead of running a process. 
//
// Make possibility to supply resulting bundle in memory instead of thru a file.
// 
// Separate index.html bundling from core bundling,
// allow externalize that functionality
// (but support thru specifying source map offset -
// position of JavaScript <script> code in HTML).
// 
// Remove reloading support into example, but make use of API.
// 
// Use caching to prevent re-reading of files if nothing changed,
// only track changed files. Use parser both to count lines
// and to find lines of code containing require() calls.
// Comparing added / removed require() calls with
// previous version of file make use of complete rebuild.
//
// Build and include in bundled map the source map for the
// browser require script require-script.js.

var path = require('path');
var chokidar = require('chokidar');
var fs = require('fs');

var depsTree = require('./lib/deps-tree');
var buildBundleJs = require('./lib/build-bundle');

// TODO: make support of output file, bundling type (html, separate js), source maps separation,
// hosing type (self-hosted, external, file://)
if (require.main === module) {
  var argv = require('optimist').argv;

  if (!argv._[0]) {
    console.log('usage: node ./node_modules/deps-bundler --watch --output index.html index.js');
    process.exit(0);
  }

  var entryPath = process.cwd() + '/' + (argv._[0] || 'index.js');
  var outputPath = process.cwd() + '/' + (argv.output || 'index.html');

  if (!argv.watch) {
    bundle(entryPath, 0, function onBuildComplete (scriptBody, sourceMap) {
      console.log(scriptBody);
      console.log(sourceMap.comment());
    });
  } else {
    autoReloadServer(entryPath, outputPath);
  }
}


// TODO:
// this function should:
//   a) calculate count of lines in source file;
//   b) strip source map comment;
//   c) detect lines changes containing require() calls.
// For the last case, this function should be supplied with
// an array of previous lines containing require() calls
// and output such array for caching.
// TODO 2: remove this function to file
function lineBreakCount (str) {
  try {
    return((str.match(/[^\n]*\n[^\n]*/gi).length));
  } catch(e) {
    return 0;
  }
}

module.exports.bundle = bundle;
function bundle (entryPath, sourceMapShiftLines, onBuildComplete) {

  depsTree(entryPath)
    .then(function (deps) {

      for (var fileIndex = 0; fileIndex < deps.order.length; ++fileIndex) {
        // Uncomment to debug module line numbers
        // console.log(sinceLine + 2);
        var moduleDesc = deps.deps[deps.order[fileIndex]];

        // Strip source map comments
        // TODO: move this to lineBreakCount function along with require() calls matcher.
        moduleDesc.stripedSource = moduleDesc.source.substring(0, moduleDesc.source.lastIndexOf("\n"));

        moduleDesc.lineBreakCount = lineBreakCount(moduleDesc.stripedSource);
      }

      // TODO: use streams and put module-by-module.
      // On stream's end write require() code for browser.
      var result = buildBundleJs(entryPath, deps, sourceMapShiftLines);

      onBuildComplete(result.scriptBody, result.sourceMap, deps.files);

    })
    .catch(function (err) {
      console.log('Error', err);
    });
};


module.exports.bundleWatch = bundleWatch;
function bundleWatch (entryPath, sourceMapShiftLines, onBuildComplete) {

  var watcher = chokidar.watch([], {persistent: true})
    .on('change', rebuild)
    .on('unlink', rebuild)

  var watchFileList = [];

  function rebuild () {

    console.log('Rebuilding...');
    watcher.unwatch(watchFileList);

    bundle(entryPath, sourceMapShiftLines, function onBuildCompleteWatch (scriptBody, sourceMap, allFiles) {
        // TODO: instead of allFiles, supply
        // with added and removed files.

        console.log('Rebuild complete.');

        onBuildComplete(scriptBody, sourceMap);

        watcher.add(allFiles);
        watchFileList = allFiles;
      });
  }

  rebuild();
};


// TODO: make support of agile changing url/port/HTML template and include way etc.
function autoReloadServer (entryPath, outputPath) {
  var g_ws = undefined;

  var htmlScriptOffsetLine = 0;
  function bundleIntoHtml (scriptBody, sourceMap) {
    // sourceMap.base64() - source map file ready to serve.
    fs.writeFileSync(outputPath, '<html><head><script>' + scriptBody + '\n' + sourceMap.comment() + '</script><style>' +
    // fs.readFileSync('./qp.css', 'utf-8') + 
    '</style></head><body><div id="container"></div></body></html>', 'utf-8');
  }

  bundleWatch(entryPath, htmlScriptOffsetLine, function onRebuilt (scriptBody, sourceMap) {
    bundleIntoHtml(scriptBody, sourceMap);

    if (g_ws) {
      g_ws.send('reload');
    }
  });

  var WebSocketServer = require('ws').Server;
  var wss = new WebSocketServer({ port: 8080 });

  wss.on('connection', function connection (ws) {
    console.log('Debugging browser connected.');

    g_ws = ws;

  });
}

