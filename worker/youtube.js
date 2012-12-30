/*
  getting dsc videos
*/

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
      return dataObj['items'].map(function(item) {
        return item['id']
      });
    } 
  }
  return [];
}

function getDsc(dsc, vidCallback) {

  var vids = [];
  var host = "gdata.youtube.com"
  var path = "/feeds/api/videos?";
  var params = {
    embed: 'allowed',
    v: 2,
    alt: 'jsonc',
    time: 'this_week'
  };
  params['q'] = 'dsc' + pad(dsc, 4);

  //recursively get all the videos for one dsc 
  function getVids(startIndex) {
    
    params['start-index'] = startIndex
    //refactor into getJson
    var thePath = path + querystring.stringify(params);
    console.log(thePath);
    http.get({host: host, port: 80, path: thePath}, function(res) {
      console.log("Got response: " + res.statusCode);
        var data = "";
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function() {
          var obj = JSON.parse(data);
          var parsedVids = parseVids(obj);
          if (parsedVids.length > 0) {
            vids = vids.concat(parsedVids);
            setTimeout(function() {
              getVids(vids.length + 1, dsc);
            }, 500);
          } else {
            vidCallback(vids)
          }
        });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
      vidCallback(vids);
    });
  }

  getVids(1);
}

exports.getDscs = function(startDsc, endDsc, vidCallback) {
  var allVids = [];
  function myGetDsc(dsc) {
    getDsc(dsc, function(vids) {
      console.log('Retrieved', vids.length, 'vids', 'with dsc', dsc);
      allVids = allVids.concat(vids);
      if (dsc < endDsc) {
        setTimeout(function() {
          myGetDsc(dsc + 1)
        }, 500);
      } else {
        vidCallback(allVids);
      }
    });
  }
  myGetDsc(startDsc);
}
