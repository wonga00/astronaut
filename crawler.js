require('log-timestamp');

var _ = require('lodash')
  , fs = require('fs')
  , path = require('path')
  , youtube = require('./youtube')
  , videoTable = require('./videotable');

var REFRESH_INTERVAL = 86400000 //one day
var MAX_VIDEOS = 8000;

function mergeVideos(existingVideos, newVideos) {
  /*
    maintains the order of the existing viedoe
    replaces existing videos with the new ones of the same ids
    new videos that haven't been seen before get appended to the end

    returns a new array
  */

  var keyPos = {};
  existingVideos.forEach(function(video, idx) {
    keyPos[video['id']] = idx;
  });

  var appendList = [],
      mergedVideos = existingVideos.slice();

  newVideos.forEach(function(video) {
    if (keyPos.hasOwnProperty(video['id'])) {
      mergedVideos[keyPos[video['id']]] = video;
    } else {
      appendList.push(video);
    }
  });

  // prune to a fixed amount by time
  var videos = mergedVideos.concat(appendList);
  videos.forEach(function(video, idx) {
    video['idx'] = idx;
  });

  videos = _.orderBy(videos, function(a) { return a.uploaded }, 'desc');
  videos = videos.slice(0, MAX_VIDEOS);
  videos = _.orderBy(videos, function(a) { return a.idx }, 'asc');
  videos.forEach(function(video) {
    delete video.idx;
  });

  return videos;
}


function appendVideos(query, newVideos) {
  // this function stores the videos in the data file
  // it maintains a maximum size and a level of freshness in the data

  // add on a fetched time
  var nowString = (new Date()).toISOString();
  newVideos.forEach(function(video) {
    video['fetched'] = nowString;
    video['query'] = query;
  });

  videoTable.readVideos(function(existingVideos) {
     // merge videos
     var videos = mergeVideos(existingVideos, newVideos);
     videoTable.writeVideos(videos);
  });
}

function crawl() {
  youtube.getVids({
    tags: ['dsc', 'mvi', 'mov', 'img'],
    startIndex: 1,
    endIndex: 100,
    maxResultsPerQuery: 20,
    vidCallback: appendVideos
  });
}

function copyFile() {
  var datestring = (new Date()).toISOString();
  var videoFile = videoTable.filename();
  var basename = path.basename(videoFile);
  var outfile = path.join(path.dirname(videoFile), datestring + '-' + basename);
  fs.createReadStream(videoFile)
    .pipe(fs.createWriteStream(outfile));
}

var argv = require('minimist')(process.argv.slice(2)),
    tags = argv['_'],
    start = parseInt(argv['start']),
    end = parseInt(argv['end']);

copyFile();
youtube.getVids({
  tags: tags,
  startIndex: start,
  endIndex: end,
  maxResultsPerQuery: 20,
  vidCallback: appendVideos
});

