/* retrieves youtube search results and writes to a file */

var fs = require('fs'),
    youtube = require('./worker/youtube.js');

var FILENAME = 'data.txt';

youtube.getVids({
    tags: ['dsc', 'img', 'mov'],
    startIndex: 3,
    endIndex: 4,
    maxResultsPerQuery: 10,
    vidCallback: function(vids) {
        var out = vids.join('\n') + '\n';
        console.log('Saving', vids.length, 'videos.');
        fs.writeFile(FILENAME, out, function(err) {
            if (err) {
                console.log('ERROR: ' + err);
            }
        })
    }
});
