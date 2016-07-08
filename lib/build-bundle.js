// This module composes results of module-deps and adds require() support for browser

var fs = require('fs');
var path = require('path');
var combineSourceMap = require('combine-source-map');

var browserRequireScript = fs.readFileSync(__dirname + '/../browser-scripts/require-script.js');


var totalAdd = 0;

// Add source file to module dependencies structure
function addBundledFile (sourceMap, depsData, sinceLine) {
  var linesAdded = 0;

  var startedAt = new Date();
  sourceMap.addFile({ sourceFile: depsData.file, source: depsData.source },
    { line: sinceLine + 1 });
  var concatenatedAt = new Date();
  totalAdd += (concatenatedAt.valueOf() - startedAt.valueOf()) / 1000.0;

  linesAdded += depsData.lineBreakCount;

  var scriptPart = "'" + depsData.file + "': [" + JSON.stringify(depsData.deps) +
    ", function (exports, require, module, __filename) {\n";

  var isJsonFile = path.extname(depsData.file) === '.json';

  if (!isJsonFile) {
    scriptPart += depsData.stripedSource;
  } else {
    scriptPart += 'module.exports = ' + depsData.stripedSource + ';';
  }
  scriptPart += "\n}],\n";

  return { scriptPart: scriptPart, linesAdded: linesAdded + 3 };
}

// deps - output of module-deps
// sourceMapShiftLines - count of lines in wrapping file before first line of script code.
module.exports = function buildBundleJs (entryPath, deps, sourceMapShiftLines) {

  // Concatenate all files together

  var scriptBody = ['var modulesInfo = {\n'];
  // Add 1 more line for starting declaration
  var sinceLine = sourceMapShiftLines + 1;

  // Engine to merging original source maps into large one.
  // Used for applying line offsets to bundled js file.
  var sourceMap = combineSourceMap.create();

  totalAdd = 0;

  for (var fileIndex = 0; fileIndex < deps.order.length; ++fileIndex) {
    // Uncomment to debug module line numbers
    // console.log(sinceLine + 2);
    var result = addBundledFile(sourceMap, deps.deps[deps.order[fileIndex]], sinceLine);

    scriptBody.push(result.scriptPart);

    sinceLine +=  result.linesAdded;
  }

  console.log('Total Map Add: ' + totalAdd);

  scriptBody.push("};\n");

  // Add require() subsystem
  scriptBody.push(browserRequireScript);

  // Add code to start main script on DOMContentLoaded event
  scriptBody.push("document.addEventListener('DOMContentLoaded', function onDomContentLoaded (event) {\n\
    loadModule('" + entryPath + "');\n\
  });");

  return { scriptBody: scriptBody.join(''), sourceMap: sourceMap };
}

