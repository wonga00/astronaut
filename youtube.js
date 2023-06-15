/*
    getting youtube videos
*/

var request = require('request'),
    moment = require('moment'),
    _ = require('lodash');

var MINIMUM_VIDEO_DURATION_SEC = 18;
var REQUEST_DELAY_MSEC = 2000;
var API_KEY = process.env.YT_API_KEY;

function pad(num, size) {
    var s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
}

function parseVids(obj) {
    if (obj.hasOwnProperty('items')) {
        var items = obj['items'];
        return items.map(function(item) {
            var duration = moment.duration(
                item['contentDetails']['duration']).asSeconds();

            return {
                id: item['id'],
                uploaded: item['snippet']['publishedAt'],
                viewCount: item['statistics']['viewCount'],
                duration: duration
            };
        });
    }
    return [];
}

function createQueries(startIndex, endIndex, tags) {
    queries = [];
    // construct queries to consume
    for (var i = 0; i < tags.length; i++) {
        var tag = tags[i];
        var j = startIndex;
        for (var j = endIndex; j >= startIndex; j--) {
            var params = {};
            params['q'] = '\"' + tag + ' ' + pad(j, 4) + '\"';
            queries.push(params);
        }
    }
    return queries;
}


/*
search youtube

params {
    q: the search term
    nextPageToken: optional next page token
}

cb(error, vids, nextParams)
*/
function search(params, cb) {
    var thisWeek = moment().add(-7, 'days').toISOString();

    params['key'] = API_KEY;
    params['part'] = params['part'] || 'snippet';
    params['type'] = params['type'] || 'video';
    params['order'] = params['order'] || 'date';
    params['maxResults'] = 50;
    params['videoEmbeddable'] = 'true';
    params['publishedAfter'] = thisWeek;

    request({
        uri: 'https://www.googleapis.com/youtube/v3/search',
        qs: params
    }, function(error, response, body) {

        if (error) {
            cb(error, [], null);
            return;
        }

        var data = JSON.parse(body);
        if (data.hasOwnProperty('error')) {
            cb(body, [], null);
            return;
        }

        var ids = data['items'].map(
            function(item) {return item['id']['videoId'];});

        var nextToken = data['nextPageToken'];
        var nextParams;
        if (nextToken) {
            nextParams = {};
            nextParams['pageToken'] = nextToken;
            nextParams['q'] = params['q'];
            nextParams['key'] = params['key'];
            nextParams['part'] = params['part'];
            nextParams['type'] = params['type'];
            nextParams['order'] = params['order'];
            nextParams['maxResults'] = params['maxResults'];
            nextParams['videoEmbeddable'] = params['videoEmbeddable'];
            nextParams['publishedAfter'] = params['publishedAfter'];
        }

        listVideos(ids, function(error, vids) {
            vids = vids.filter(function(vid) {
                return vid.duration > MINIMUM_VIDEO_DURATION_SEC;
            });
            cb(error, vids, nextParams)
        });
    });
}

/*
    List endpoint
    gets additional metadata for video ids

    videoIds: ['ckjkfjl3', 'lckajckl2']
    cb: function(error, videoObjects)
*/
function listVideos(videoIds, cb) {

    var params = {};
    params['key'] = API_KEY;
    params['part'] = 'id,statistics,contentDetails,snippet';
    params['id'] = videoIds.join(',');
    params['maxResults'] = 50;

    request({
        uri: 'https://www.googleapis.com/youtube/v3/videos',
        qs: params
    }, function(error, response, body) {

        if (error) {
            cb(error, []);
            return;
        }

        var data = JSON.parse(body);
        if (data.hasOwnProperty('error')) {
            cb(data, []);
            return;
        }

        var videos = parseVids(data);
        cb(null, videos);
    });
}

/*
    GET Playlist
*/
function getPlaylist(playlistId, cb) {
    var params = {
        key: API_KEY,
        part: 'id,snippet',
        playlistId: playlistId,
        maxResults: 50
    }
    request({
        uri: 'https://www.googleapis.com/youtube/v3/playlistItems',
        qs: params,
    }, function(error, response, body) {
        if (error) {
            console.log(error);
            cb(error, []);
            return;
        }

        var data = JSON.parse(body);
        var vids = data['items'].map(function(item) {
            return item['snippet']['resourceId']['videoId'];
        });

        cb(error, vids);
    });
}

function createRandomString() {
    return Math.random().toString(36).substring(2, 10);
}

var mockStrings = [
    '7lofyg23',
    'u3tfzhxh',
    '905uypzx',
    'wmcbs043',
    'aaa',
    'bbb'
];
var mockIdx = 0;

function createMockString() {
    mockIdx = (mockIdx + 1) % mockStrings.length;
    return mockStrings[mockIdx];
}

function mockSearch(params, cb) {
    /*
    video object
    {
        id: 'lakjfkjal'
        uploaded: timestamp // verify if this is a utc string
        viewCount: 34
        duration: 2384
    }
    */
    // returns 2 random generated strings
    var videos = [];
    for (var i = 0; i < 2; i++) {
        videos.push({
            id: createMockString(),
            uploaded: (new Date()).toISOString(),
            viewCount: 10,
            duration: 100
        });
    }

    cb(null, videos, null);
}

/*
    retrieves youtube videos of the form

        TAG 000X

    ex. DSC 0001

    tags: is an array of number prefixes ex. dsc, img
    startIndex:   'DSC 0001' would be 1
    endIndex:     'DSC 0234' would be 234
    vidCallback:  function(query, vids) processes an array of vidids
    endCallback:  function() called when everything is done
*/
function getVids(args) {

    var tags = args.tags || [];
    var startIndex = args.startIndex || 1;
    var endIndex = args.endIndex || 10;
    var maxResultsPerQuery = args.maxResultsPerQuery || -1;
    var vidCallback = args.vidCallback;

    console.log('Getting youtube vids:');
    console.log('tags: ', tags);
    console.log('startIndex: ', startIndex);
    console.log('endIndex: ', endIndex);
    console.log('maxResultsPerQuery: ', maxResultsPerQuery);
    console.log('');

    var queries = createQueries(startIndex, endIndex, tags);
    // shuffle them so the indices are not contiguous
    queries = _.shuffle(queries);

    var queryVidCount = {}; // keeps track of page counts per query

    function work() {

        var params = queries.pop();
        console.log('search for: ', params['q']);

        search(params, function(error, vids, nextParams) {
            if (error) {
                console.error('Search error: ' + error);
                return;
            }

            console.log('retrieved', vids.length, 'vids');
            vidCallback(params.q, vids);

            if (queryVidCount[params.q]) {
                queryVidCount[params['q']] += vids.length;
            } else {
                queryVidCount[params['q']] = vids.length;
            }

            // check if we need to schedule more work
            if (nextParams && queryVidCount[params['q']] < maxResultsPerQuery) {
                console.log('get more...');
                queries.push(nextParams);
            }

            if (queries.length > 0) {
                setTimeout(work, REQUEST_DELAY_MSEC);
            }

        });
    }

    work();
}

exports.listVideos = listVideos;
exports.search = search;
exports.getVids = getVids;
exports.getPlaylist = getPlaylist;
