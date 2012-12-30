
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , csv = require('csv')
  , youtube = require('./worker/youtube');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
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

var VIDEO_INTERVAL = 5000;
var videos = [];
var index = 0;
var DATA_FILE = __dirname + '/data.txt';
var intervalId = 0;
var currentVid = {};

/* 
  fisher-yates shuffle algorithm taken from
  http://sedition.com/perl/javascript-fy.html
*/
Array.prototype.shuffle = function() {
  var i = this.length;
  if ( i == 0 ) return;
  while ( --i ) {
     var j = Math.floor( Math.random() * ( i + 1 ) );
     var tempi = this[i];
     var tempj = this[j];
     this[i] = tempj;
     this[j] = tempi;
   }
   return this;
}

function sendVideo() {
  var vid = videos[index++];
  var now = (new Date())/1000;
  var data = {vid:vid, time:now};
  currentVid = data;
  io.sockets.emit('vid', data);

  //shuffle array if at the end of the list
  if (index == videos.length) {
    videos.shuffle();
    index = 0;
  }
}

function readVideos() {
  csv()
  .from.path(DATA_FILE)
  .transform(function(data){
      data.unshift(data.pop());
      return data;
  })
  .on('record',function(data, index){
      videos.push(data[0]);
  })
  .on('end',function(count){
      console.log('Read in', count, 'videos.');
      intervalId = setInterval(sendVideo, VIDEO_INTERVAL);
  })
  .on('error',function(error){
      console.log(error.message);
  });
}

function getFreshVideos() {
  youtube.getDscs(114, 115, function(vids) {
    clearInterval(intervalId);
    videos = vids.shuffle();
    index = 0;
    intervalId = setInterval(sendVideo, VIDEO_INTERVAL);
  });
}

// Real-time
io.sockets.on('connection', function(socket) {
    socket.emit('vid', currentVid);
    socket.on("disconnect", function() {

    });
});

// Routes

app.get('/',  function(req, res){
  res.sendfile(__dirname + '/views/index.html');
});

app.get('/test/',  function(req, res){
  res.sendfile(__dirname + '/views/smooth.html');
});

server.listen(process.env['app_port'] || 3000);
console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
readVideos();

getFreshVideos();
//refresh everyday
setInterval(getFreshVideos, 86400000);