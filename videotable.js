const csvParser = require('csv-parse'),
    csvStringify = require('csv-stringify'),
    fs = require('fs');

const DATA_FILE = process.env.VIDEO_FILE,
      COLUMNS = ['id', 'viewCount', 'duration', 'uploaded', 'fetched', 'query'];

if (!DATA_FILE) {
  throw "no video file";
}

function readVideos(cb) {
  var videos = [];
  var parser = csvParser({columns: COLUMNS})
  parser.on('readable', () => {
    let record;
    while (record = parser.read()) {
      record['viewCount'] = parseInt(record['viewCount']);
      record['duration'] = parseInt(record['duration']);
      delete record['']; // what is this thing?
      videos.push(record);
    }
  });
  parser.on('error', (err) => console.error(err.message));
  parser.on('end', () => cb(videos));
  fs.createReadStream(DATA_FILE).pipe(parser);
}

// expects [{id, viewCount, duration, uploaded, fetched}, ]
function writeVideos(videos) {
  var csvWriter = csvStringify({columns: COLUMNS});
  csvWriter.on('error', (err) => {
    console.error(err.message);
  });
  csvWriter.pipe(fs.createWriteStream(DATA_FILE));

  videos.forEach(function(video) {
   csvWriter.write(video);
  });

  csvWriter.end();
}

exports.readVideos = readVideos;
exports.writeVideos = writeVideos;
exports.filename = function() {
  return DATA_FILE;
};
