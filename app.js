
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , videoStream = require('./videoStream.js');


/* --------- CONFIG ------------ */

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


/* ---------- REAL-TIME ---------- */

io.sockets.on('connection', function(socket) {
    socket.emit('vid', videoStream.currentVid());
    socket.on("disconnect", function() {});
});


/* ---------- ROUTES ------------ */

app.get('/',  function(req, res){
  res.sendfile(__dirname + '/views/index.html');
});

app.get('/v/:vidId', function(req, res) {
  var vidId = req.params.vidId;
  //use render here
  res.render('index.html', {
    title: 'Shared',
    vidId: vidId
  });
});

app.get('/z/', function(req, res) {
  res.render('admin', {
    layout: 'layout.jade',
    title: 'Admin',
    numVideos: videoStream.numVideos(),
    numConnections: io.sockets.clients().length,
    lastRefresh: videoStream.lastRefresh()
  });
});

server.listen(process.env['app_port'] || 3000);
console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);

videoStream.start(function(data) {
  io.sockets.emit('vid', data);
});
