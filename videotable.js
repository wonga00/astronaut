var csv = require('csv');

var DATA_FILE = process.env.VIDEO_FILE;
var COLUMNS = ['id', 'viewCount', 'duration', 'uploaded', 'fetched', 'query'];

if (!DATA_FILE) {
  throw "no video file";
}

function readVideos(cb) {
  var vids = [];
  csv()
    .from.path(DATA_FILE, {columns: COLUMNS})
    .transform(function(data) {
      data['viewCount'] = parseInt(data['viewCount']);
      data['duration'] = parseInt(data['duration']);
      return data;
    })
    .on('record', function(data, index){
        vids.push(data);
    })
    .on('end',function(count){
        cb(vids);
    })
    .on('error',function(error){
        console.error(error.message);
        cb([]);
    });
}

// expects [{id, viewCount, duration, uploaded, fetched}, ]
function writeVideos(videos) {
  var table = csv()
    .to.path(DATA_FILE, {columns: COLUMNS})
    .on('end',function(count){
    })
    .on('error',function(error){
        console.error(error.message);
    });

  videos.forEach(function(video) {
   table.write(video);
  });

  table.end();
}

exports.readVideos = readVideos;
exports.writeVideos = writeVideos;
exports.filename = function() {
  return DATA_FILE;
};
