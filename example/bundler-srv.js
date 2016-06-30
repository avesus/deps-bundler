var depsBundler = require('deps-bundler');

var server = require('http').createServer()
  , url = require('url')
  , WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ server: server })
  , express = require('express')
  , zlib = require('zlib')
  , app = express()
  , convert = require('convert-source-map')
  , port = 8080;

g_indexHtml = '';
g_sourceMap = '';

var htmlScriptOffsetLine = 0;
function bundleIntoHtml (scriptBody, sourceMap) {
  // sourceMap.base64() - source map file ready to serve.
  g_indexHtml = '<html><head><script>' + scriptBody + '\n//# sourceMappingURL=index.html.map\n' +
    "var socket = new WebSocket('ws://localhost:8080');\
     socket.onmessage = function (event) {\
       if (event.data === 'reload') {\
         location.reload(true);\
         console.log('Reloading page....');\
       }\
    };"
    + '</script><style>' +
    // fs.readFileSync('./qp.css', 'utf-8') + 
    '</style></head><body><div id="container"></div></body></html>';

  g_sourceMap = sourceMap.base64();
  // g_sourceMap = util.inspect(convert.fromBase64(g_sourceMap).toObject(), {depth: null});
  g_sourceMap = JSON.stringify(convert.fromBase64(g_sourceMap).toObject());

  zlib.gzip(g_indexHtml, (err, buffer) => {
    if (!err) {
      g_indexHtml = buffer;
    }
  });
}

depsBundler.bundleWatch(__dirname + '/ma.js', htmlScriptOffsetLine, function onRebuilt (scriptBody, sourceMap) {
  bundleIntoHtml(scriptBody, sourceMap);

  wss.broadcast('reload');
});

/*
var router = express.Router();
router.get('/', function (req, res) {
  res.write(g_indexHtml);
});

router.get('/index.html.map', function (req, res) {
  res.end(g_sourceMap);
});

app.use('/', router);
*/

var util = require('util');

app.get('/', function (req, res) {
  res.header('Content-Encoding', 'gzip');
  res.end(g_indexHtml);
});

app.get('/index.html.map', function (req, res) {
  console.log('Asking source map - enable debug with auto reload on change.');
  res.header('Content-Type', 'application/json');
  res.end(g_sourceMap);

});


wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });


