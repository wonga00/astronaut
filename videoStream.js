/*
    streaming video ids

    ex. videoStream.start(callback);

    receives a video, timestamp at regular intervals
*/

var _ = require('lodash')
  , youtube = require('./youtube')
  , videoTable = require('./videotable');

var VIDEO_INTERVAL = 8000;
var sendVideoTimer = 0;

var cursor = -1;
var currentVid = {};
var positions = []; // array of positions of the video list to cycle through
var videos = [];
var videoCallback;


// ad config
// these are the interstitual videos
// var ads = ["Ip2ZGND1I9Q"];
var adIndex = 0;
var ads = [];
var lastAdTime = new Date();
var AD_INTERVAL = 60000 * 3; //time in between ads in milliseconds


function shouldSendAd() {
  var now = new Date();
  return  (now - lastAdTime) > AD_INTERVAL;
}

function getNextAd() {
  var vid = ads[adIndex];
  adIndex = (adIndex + 1) % ads.length;
  lastAdTime = new Date();
  // we have to match the same format as a normal video
  return {
    id: vid,
    viewCount: 1000,
    uploaded: '2015-01-01T15:29:36Z'
  }
}


function sendVideo() {
  // sends the video at the cursor and increments the cursor
  videoTable.readVideos(function(_videos) {
    videos = _videos;
    if (!videos) {
      console.log('no videos');
      return;
    }

    // first ensure our position list matches the video list
    cursor += 1;

    if ((positions.length != videos.length) || (cursor >= videos.length)) {
      positions = _.shuffle(_.range(videos.length));
      cursor = 0;
    }

    var position = positions[cursor];
    console.log(
      'num videos:', videos.length,
      'cursor:', cursor,
      'position:', position);

    var data = {
      video: videos[position],
      time: (new Date())/1000,
      offset: 0
    };

    currentVid = data;

    if (videoCallback) {
      videoCallback(currentVid);
    }


  });
}

function start(sendVideoCallback) {
    videoCallback = sendVideoCallback;
    cursor = 0;
    clearInterval(sendVideoTimer);
    sendVideo();
    sendVideoTimer = setInterval(sendVideo, VIDEO_INTERVAL);
}

exports.start = start;

exports.currentVid = function() {
    return currentVid;
};
exports.numVideos = function() {
  return videos.length;
};
exports.videos = function() {
  return videos;
}
