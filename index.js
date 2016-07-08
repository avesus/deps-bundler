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

var scanFileForMapsLinesRequires = require('./lib/scan-file.js');

var prevLinesCache = {};

module.exports.bundle = bundle;
function bundle (entryPath, cacheOpts, sourceMapShiftLines, onBuildComplete, onDepFound, onDepsFound, onError) {

  depsTree(entryPath,
    cacheOpts,
    function onDependencyFound (dep) {
      onDepFound(dep)
    },

    function onComplete (deps, newCacheOpts) {

      onDepsFound(deps);

      // TODO: Run this on watched files instead of dependencies
      // to detect dramatical changes (new require calls).
      for (var fileIndex = 0; fileIndex < deps.order.length; ++fileIndex) {
        var moduleDesc = deps.deps[deps.order[fileIndex]];

        var fileAnalizysReport = scanFileForMapsLinesRequires(moduleDesc.source, prevLinesCache[moduleDesc.file]);
        if (fileAnalizysReport.requireDiffers) {
          prevLinesCache[moduleDesc.file] = fileAnalizysReport.newRequireLines;
        }

        moduleDesc.lineBreakCount = fileAnalizysReport.lineBreaks;

        if (fileAnalizysReport.stripeLines[0]) {
          moduleDesc.stripedSource = moduleDesc.source.substring(0, fileAnalizysReport.stripeLines[0].from);
        } else {
          moduleDesc.stripedSource = moduleDesc.source;
        }
 
      }

      // TODO: use streams and put module-by-module.
      // On stream's end write require() code for browser.
      var startedAt = new Date();
      var result = buildBundleJs(entryPath, deps, sourceMapShiftLines);
      var concatenatedAt = new Date();
      console.log('\nGather Source Maps And Concatenate: ' +
        (concatenatedAt.valueOf() - startedAt.valueOf()) / 1000.0 + ' sec');

      onBuildComplete(result.scriptBody, result.sourceMap, deps.files, newCacheOpts);
    },

    function onError (err) {
      console.log('Error', err);
      process.exit(0);
    });
};

function formatTime (time) {
  return time
    .toISOString()
    .split('T')
    [1]
    .split('.')
    [0];
}

module.exports.bundleWatch = bundleWatch;
function bundleWatch (entryPath, sourceMapShiftLines, onBuildComplete) {

  var watcher = chokidar.watch([], {persistent: true})
    .on('change', rebuild)
    .on('unlink', rebuild)

  var watchFileList = [];

  var cacheOpts = {};

  function rebuild () {

    var startedAt = new Date();
    var depsFoundAt = startedAt;

    console.log('\nScanning and bundling dependencies of\n  ' + entryPath + '...\n');
    watcher.unwatch(watchFileList);

    bundle(entryPath, cacheOpts, sourceMapShiftLines,
      function onBuildCompleteWatch (scriptBody, sourceMap, allFiles, newCacheOpts) {

        cacheOpts = newCacheOpts;

        // TODO: instead of allFiles, supply
        // with added and removed files.

        var completeAt = new Date();

        console.log('\nJoin: ' +
          (completeAt.valueOf() - depsFoundAt.valueOf()) / 1000.0 + ' sec');

        console.log('\n' + formatTime(completeAt) + ':  built complete in ' +
          (completeAt.valueOf() - startedAt.valueOf()) / 1000.0 + ' sec');

        onBuildComplete(scriptBody, sourceMap);

        watcher.add(allFiles);
        watchFileList = allFiles;
      },
      function onDepFound (dep) {
        watcher.add(dep.file);
        console.log('  ' + dep.file);
      },
      function onDepsFound (deps) {
        depsFoundAt = new Date();
        console.log('\nScan: ' +
          (depsFoundAt.valueOf() - startedAt.valueOf()) / 1000.0 +' sec');
      },
      function onError (error) {
        console.log(error);
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

