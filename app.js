
/**
 * Module dependencies.
 */

require('log-timestamp');

var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , moment = require('moment')
  , videoStream = require('./videoStream.js')
  , numViewers = 0
  , lastHeld;


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
  io.set('log level', '3'); // debug level
});

app.configure('production', function(){
  app.use(express.errorHandler());
  io.set('log level', '1'); // warn level
});


function logEvent(eventType, data) {
  console.log("event", {
    eventType: eventType,
    payload: data,
    t: (new Date()).toISOString()
  });
}

/* ---------- REAL-TIME ---------- */

io.sockets.on('connection', function(socket) {
    socket.emit('video', videoStream.currentVid());
    socket.emit('held', lastHeld);

    numViewers += 1;
    io.sockets.emit('num_viewers', numViewers);

    socket.on("control", function(d) {
      logEvent('control', d);
      if (d.controlType === 'hold') {
        lastHeld = d.videoId;
        io.sockets.emit("held", lastHeld);
      }
    });

    socket.on("disconnect", function() {
      numViewers -= 1;
      io.sockets.emit('num_viewers', numViewers);
    } );
});


/* ---------- ROUTES ------------ */

app.get('/z', function(req, res) {
  res.render('admin.ejs', {
    title: 'Admin',
    numVideos: videoStream.numVideos(),
    numConnections: io.sockets.clients().length,
    lastHeld: lastHeld
  });
});

app.get('/grid', function(req, res) {
  var videos = videoStream.videos();
  res.render('grid.ejs', {
    title: 'Grid',
    videos: videos,
    moment: moment
  });
});

app.get('/', function(req, res) {
  res.render('v2.ejs', {});
});

app.get('/idfa', function(req, res) {
  res.render('idfa.ejs', {});
})

server.listen(process.env['app_port'] || 3000);
console.log("Astronaut server listening on port %d in %s mode", server.address().port, app.settings.env);

videoStream.start(function(data) {
  logEvent('emitVideo', data);
  io.sockets.emit('video', data);
});
