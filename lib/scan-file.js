// This function:
//   a) calculates count of lines in source file;
//   b) strips source map comment in the end of file;
//   c) detect lines changes containing require() calls.
// For the last case, this function should be supplied with
// an array of previous lines containing require() calls
// and output such array for caching.
module.exports = scanFileForMapsLinesRequires;
function scanFileForMapsLinesRequires (str, previousRequireLines) {

  var lineBreaks = 0;

  function old () {
  try {
    lineBreaks = ((str.match(/[^\n]*\n[^\n]*/gi).length));
  } catch (e) {
    
  }

  return {lineBreaks: lineBreaks,
      stripeLines: [],
      newRequireLines: {},
      requireDiffers: false
    };
  }


  var strLen = str.length;

  var state = {
    commentedLine: false,
    trackComment: 0,
    checkLineForSourceMappingUrl: false,
    checkLineForRequire: false
  };

  var lineStart = 0;

  var line = '';
  var char = '';

  var stripeLines = [];
  var newRequireLines = {};

  var requireDiffers = false;

  for (var pos = 0; pos <= strLen; ++pos) {

    if (pos !== strLen) {
      char = str[pos];
    } else {
      char = '\0';
    }

    switch (char) {

    case '\n':
    case '\0':
	++lineBreaks;

      if (state.checkLineForSourceMappingUrl) {
        line = str.substring(lineStart, pos);
        if (/[#@] sourceMappingURL/.test(line)) {
          stripeLines.push({from: lineStart, to: pos});
        }
        state.checkLineForSourceMappingUrl = false;

      } else if (state.checkLineForRequire) {
        line = str.substring(lineStart, pos);
        if (line.indexOf('require') > -1) {

          if (!requireDiffers) {
            if (!previousRequireLines || !previousRequireLines[line]) {
              requireDiffers = true;
            }
          }
     
          if (requireDiffers) {
            newRequireLines[line] = lineBreaks;
          }
        }
      }

      state.checkLineForRequire = false;
      state.commentedLine = false;
      lineStart = pos + 1;
      break;

    case '#':
      if (state.commentedLine) {
        state.checkLineForSourceMappingUrl = true;
      }
      break;

    case 'r':
      if (!state.commentedLine) {
        state.checkLineForRequire = true;
      }
      break;

    case '/':

      if (state.trackComment) {
        state.commentedLine = true;
        state.trackComment = false;
      } else if (!state.commentedLine) {
        state.trackComment = true;
      }
      break;

    default:

      state.trackComment = false;
    }
  }

  return {lineBreaks: lineBreaks - 1,
      stripeLines: stripeLines,
      newRequireLines: newRequireLines,
      requireDiffers: requireDiffers
    };
}

