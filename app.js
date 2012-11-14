
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
  , fs = require('fs');

  /*
var csv = require('csv');
var fs = require('fs');
var app = module.exports = express();
var io = require('socket.io').listen(app);
*/
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

/* 
  our 'database' is just a text file of video ids for now
  we read into an in-memory array whenever the file changes

  interface

  var broadcaster = require('broadcaster');
  broadcaster().
  .file(DATA_FILE)
  .client(io.sockets);

*/

var videos = [];
var index = 0;
var DATA_FILE = './data.txt';
var intervalId = 0;

function sendVideo() {
  var vid = videos[index++ % videos.length];
  console.log('Now playing: ' + vid);
  var now = (new Date())/1000;
  var data = {vid:vid, time:now};
  io.sockets.emit('vid', data);
}

function readVideos() {
  videos = [];
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
      intervalId = setInterval(sendVideo, 5000);
  })
  .on('error',function(error){
      console.log(error.message);
  });
}

// fs.watchFile(DATA_FILE, function (curr, prev) {
//   console.log('Video list has changed, refreshing...');
//   clearInterval(intervalId);
//   readVideos();
// });

// Real-time
io.sockets.on('connection', function(socket) {
    socket.on("disconnect", function() {

    });
});

// Routes

app.get('/',  function(req, res){
  res.sendfile('views/index.html');
});

server.listen(3000);
console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
readVideos();