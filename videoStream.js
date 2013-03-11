/*
    streaming video ids

    ex. videoStream.start(callback);

    receives a video, timestamp at regular intervals
*/

var csv = require('csv')
  , youtube = require('./worker/youtube');

var VIDEO_INTERVAL = 5000;
var videos = [];
var index = 0;
var DATA_FILE = __dirname + '/data.txt';
var intervalId = 0;
var currentVid = {};
var lastRefresh;
var videoCallback;
var REFRESH_INTERVAL = 86400000 //one day


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
  if (index >= videos.length) {
    index = 0;
    return;
  }
  var vid = videos[index++];
  var now = (new Date())/1000;
  var data = {vid:vid, time:now};
  currentVid = data;

  if (videoCallback) {
      videoCallback(currentVid);
  }

  //shuffle array if at the end of the list
  if (index == videos.length) {
    videos.shuffle();
    index = 0;
  }
}

function loadVideos(vids) {
    clearInterval(intervalId);
    videos = vids.shuffle();
    index = 0;
    intervalId = setInterval(sendVideo, VIDEO_INTERVAL);
    lastRefresh = new Date();
}

function readVideos() {
  var vids = [];
  csv()
  .from.path(DATA_FILE)
  .transform(function(data){
      data.unshift(data.pop());
      return data;
  })
  .on('record',function(data, index){
      vids.push(data[0]);
  })
  .on('end',function(count){
      console.log('Read in', count, 'videos.');
      loadVideos(vids);
  })
  .on('error',function(error){
      console.log(error.message);
  });
}

function getFreshVideos() {
  youtube.getVids(['dsc', 'img', 'mov'], 3, 699, function(vids) {
    loadVideos(vids);
  });
}

function start(video) {
    videoCallback = video;
    readVideos();
    getFreshVideos();
    setInterval(getFreshVideos, REFRESH_INTERVAL);
}

exports.start = start;
exports.currentVid = function() {
    return currentVid;
}
exports.lastRefresh = function() {
    return lastRefresh;
}
exports.numVideos = function() {
    return videos.length;
}