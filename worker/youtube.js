/*
  getting youtube videos
*/

// seconds
var MINIMUM_DURATION = 10
// milliseconds
var REQUEST_DELAY = 500

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
        return (item['duration'] > MINIMUM_DURATION);
      }).map(function(item) {
        return item['id']
      });
    } 
  }
  return [];
}

// tags is an array of number prefixes
// ex. dsc or img
function getVids(tags, startIndex, endIndex, vidCallback) {

  var vids = [];
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
          "start-index": 1
        };
        params['q'] = "\"" + tag + " " + pad(j, 4) + "\"";
        queries.push(params);
    }
  }

  //worker for the queue of queries
  function work() {
    var params = queries.pop();
    //console.log('search for: ', params['q']);
    var startIndex = params['start-index'];
    var thePath = path + querystring.stringify(params);
    //console.log(thePath);
    http.get({host: host, port: 80, path: thePath}, function(res) {
      //console.log("Got response: " + res.statusCode);
        var data = "";
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function() {
          var obj = JSON.parse(data);
          var parsedVids = parseVids(obj);
          if (parsedVids.length > 0) {
            //console.log('retrieved', parsedVids.length, 'vids');
            vids = vids.concat(parsedVids);
            //enqueue a new request
            params["start-index"] = startIndex + parsedVids.length;
            queries.push(params);
          }
          if (queries.length == 0) {
            vidCallback(vids);
          } else {
            setTimeout(work, REQUEST_DELAY);
          }
        });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      vidCallback(vids);
    });
  }

  //kick it off
  work();
}

exports.getVids = getVids;