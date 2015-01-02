/*
  getting youtube videos
*/

require('./arrayutil');

var MINIMUM_VIDEO_DURATION_SEC = 10
var REQUEST_DELAY_MSEC = 2000

var http = require('http'),
    querystring = require('querystring');

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function parseVids(obj) {
  if (obj.hasOwnProperty('data')) {
    var dataObj = obj['data']
    if (dataObj.hasOwnProperty('items')) {
      return dataObj['items'].filter(function(item) {
        return (item['duration'] > MINIMUM_VIDEO_DURATION_SEC);
      }).map(function(item) {
        return {
          id: item['id'],
          uploaded: item['uploaded'],
          viewCount: item['viewCount']
        }
      });
    }
  }
  return [];
}

/*
  retrieves youtube videos of the form

    TAG 000X

  ex. DSC 0001

  tags: is an array of number prefixes ex. dsc, img
  startIndex:   'DSC 0001' would be 1
  endIndex:     'DSC 0234' would be 234
  vidCallback:  function(vids) processes an array of vidids
  endCallback:  function() called when everything is done
*/
function getVids(args) {

  var tags = args.tags || [];
  var startIndex = args.startIndex || 1;
  var endIndex = args.endIndex || 10;
  var maxResultsPerQuery = args.maxResultsPerQuery || -1;
  var vidCallback = args.vidCallback;
  var endCallback = args.endCallback;

  console.log('Getting youtube vids:');
  console.log('tags: ', tags);
  console.log('startIndex: ', startIndex);
  console.log('endIndex: ', endIndex);
  console.log('maxResultsPerQuery: ', maxResultsPerQuery);
  console.log('');

  var host = "gdata.youtube.com"
  var path = "/feeds/api/videos?";
  var queries = [];

  // construct queries to consume
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    var j = startIndex;
    for (var j=endIndex; j >= startIndex; j--) {
        // see https://developers.google.com/youtube/2.0/developers_guide_protocol_api_query_parameters#Searching_for_Videos
        var params = {
          embed: 'allowed',
          v: 2,
          alt: 'jsonc',
          time: 'this_week',
          'start-index': 1
        };
        params['q'] = "\"" + tag + " " + pad(j, 4) + "\"";
        queries.push(params);
    }
  }

  // shuffle them so the indices are not contiguous
  queries.shuffle();

  // console.log('QUERIES:', queries);
  // worker for the queue of queries
  function work() {
    var params = queries.pop();
    var startIndex = params['start-index'];
    var thePath = path + querystring.stringify(params);

    console.log('search for: ', params['q']);
    console.log(thePath);

    http.get({host: host, port: 80, path: thePath}, function(res) {
      console.log("Response Code: " + res.statusCode);
        var data = "";
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function() {
          var obj = JSON.parse(data);
          var parsedVids = parseVids(obj);
          if (parsedVids.length > 0) {
            console.log('retrieved', parsedVids.length, 'vids');
            vidCallback(parsedVids);
            //enqueue a new request
            params['start-index'] = startIndex + parsedVids.length;

            if ((params['start_index'] <= maxResultsPerQuery) ||
                (maxResultsPerQuery == -1)) {

              queries.push(params);
            }
          }
          if (queries.length == 0) {
            // we are done
            if (endCallback) {
              endCallback();
            }
          } else {
            // schedule the next request
            setTimeout(work, REQUEST_DELAY_MSEC);
          }
        });

    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      // probably not the best exit strategy here?
      endCallback();
    });
  }

  //kick it off
  work();
}

exports.getVids = getVids;
