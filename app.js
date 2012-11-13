
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , redis = require('redis');

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  //app.set('view engine', 'jade');
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

// Real-time
var clients = {};

io.sockets.on('connection', function(socket) {
    var r = redis.createClient();
    r.socket = socket;
    r.subscribe('vid');
    r.on('message', function(channel, message) {
        console.log(channel + ':' + message);
        var now = (new Date())/1000;
        var vid = {vid:message, time:now};
        socket.emit('vid', vid);
    });
    clients[socket.id] = r;

    socket.on("disconnect", function() {
        var r = clients[socket.id];
        r.quit();
        delete clients[socket.id];
    });
});

var redisPoll = redis.createClient();
var currentIdx = 0;
// long running repetitive process
setInterval(function() {
  // read from the db
  redisPoll.llen("dsc", function(err, reply) {
    if (currentIdx >= reply) {
      currentIdx = 0;
    }
    redisPoll.lindex("dsc", currentIdx, function(err, reply) {
      console.log("error: " + err + " reply: " + reply);
      var now = (new Date())/1000;
      var vid = {vid:reply, time:now};
      io.sockets.emit('vid', vid);
      currentIdx += 1;
    });
  })


}, 5000 );

// Routes

app.get('/',  function(req, res){
  res.sendfile('views/index.html');
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
