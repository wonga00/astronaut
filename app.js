
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');
var csv = require('csv');
var fs = require('fs');
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

/* 
  our 'database' is just a text file of video ids for now
  we read into an in-memory array whenever the file changes
*/

var videos = [];
var index = 0;
var DATA_FILE = './data.txt';
var intervalId = 0;

function sendVideo() {

  //check if there is a newer db file

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

fs.watchFile(DATA_FILE, function (curr, prev) {
  console.log('Video list has changed, refreshing...');
  clearInterval(intervalId);
  readVideos();
});

// Real-time
io.sockets.on('connection', function(socket) {
    socket.on("disconnect", function() {

    });
});

// Routes

app.get('/',  function(req, res){
  res.sendfile('views/index.html');
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
readVideos();