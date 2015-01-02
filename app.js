
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , moment = require('moment')
  , videoStream = require('./videoStream.js');


/* --------- CONFIG ------------ */

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  videoStream.setCrawlEnabled(true);
});

app.configure('production', function(){
  app.use(express.errorHandler());
  videoStream.setCrawlEnabled(true);
});


/* ---------- REAL-TIME ---------- */

io.sockets.on('connection', function(socket) {
    socket.emit('vid', videoStream.currentVid());
    io.sockets.emit('num_viewers', io.sockets.clients().length);
    socket.on("disconnect", function() {
      io.sockets.emit('num_viewers', io.sockets.clients().length - 1);
    } );
});


/* ---------- ROUTES ------------ */

app.get('/',  function(req, res){
  res.render('index.ejs', {
    host: "http://astronaut.io",
    vidId: ""
  });
});

app.get('/v/:vidId', function(req, res) {
  var vidId = req.params.vidId;
  //use render here
  res.render('index.ejs', {
    host: "http://astronaut.io",
    vidId: vidId
  });
});

app.get('/z', function(req, res) {
  res.render('admin.ejs', {
    title: 'Admin',
    numVideos: videoStream.numVideos(),
    numConnections: io.sockets.clients().length,
    lastRefresh: videoStream.lastRefresh()
  });
});

app.get('/grid', function(req, res) {
  res.render('grid.ejs', {
    title: 'Grid',
    videos: videoStream.videos(),
    moment: moment
  });
});

server.listen(process.env['app_port'] || 3000);
console.log("Astronaut server listening on port %d in %s mode", server.address().port, app.settings.env);

videoStream.start(function(data) {
  io.sockets.emit('vid', data);
});
