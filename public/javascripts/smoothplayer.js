/*
    SmoothPlayer
    author: Andrew Wong
    date: 7/19/2011

    SmoothPlayer is a singleton. swfobject.js must be included beforehand
    to use, initialize with the id of the div element and size, as well as a callback function
    that will be called when ready
    ex. SmoothPlayer.init(smoothdiv, WIDTH, HEIGHT, readyCb);

    init(div:String, width:Number, height:Number, [ready()]):Void

    to play a video, call
    play(videoId:String):Boolean
        returns false if player is not ready to receive (see readyCb), otherwise true
        enqueues the next video in the buffering player

    to mute/unmute
    mute():Void
    unMute():Void

    hold():Void
        prevents the current video from being changed while new videos are enqueued with 'play'
    goBack():Void
        plays the previous video
    resume():Void
        returns to the current video
    backVid():String
        returns the video id being played in the 'back' player
    currentVid():String
        returns the video id being played in the 'current' player
*/


var SmoothPlayer = {
    count : 0,
    height : 356,
    width : 425,
    muted : false,
    ready : false,
    holdState : false,
    firstVideo : true,
    //dictionary of video ids : player id <-> video id
    vids : {},

    //possible players
    current : undefined, //should always be playing
    back : undefined, //can be paused or playing if in 'hold state' and a new video comes
    buffering : undefined, //should be loading -- when starting play it turns into current

    /*

    States

    holding and going back do the same thing in terms of what happens to the other two players

    players A, B, C
    if B is Held it is Live until a new video arrives.
    Live -> Back (is visible and playing)
    Buffering -> Live
    Back -> Buffering

    in the Live State
    Live State == current is visible
    if a new video comes
    Live -> Back (is paused and hidden)
    Buffering -> Live (is visible and playing)
    Back -> Buffering (is loading and hidden)

    if a video comes when the user is in the back state
    Live -> Buffering
    Buffering -> Live

    if user goes back:
    back becomes visible and resumes
    live becomes invisible but still playing
    buffering continues to buffer

    if the viewer goes Back they should see the last video that was Live
    if the player goes back to C, A and B take turns being the live video

    you can only transition from a Live -> Back, Live -> Held
    Back -> Live
    Hold -> Live

    */


    init : function(divname, width, height, onReady, onResume, onStart, soundurl) {
        this.soundurl = soundurl;
        if (width) {
            this.width = width;
        }
        if (height) {
            this.height = height;
        }
        this.onReady = onReady;
        this.onResume = onResume;
        this.onStart = onStart;

        document.getElementById(divname).innerHTML = "<div id =\"smoothplay_1\"></div><div id=\"smoothplay_2\"></div><div id=\"smoothplay_3\"></div><div id=\"soundplayer\"></div>";
        this.createPlayer("smoothplay_1","p1", this.width, this.height);
        this.createPlayer("smoothplay_2","p2", 1, 1);
        this.createPlayer("smoothplay_3","p3", 1, 1);
    },

    createPlayer : function(divName, playerName, width, height) {
        var params = { allowScriptAccess: "always", wmode: "transparent"};
        var atts = { id: playerName}
        //chrome-less version
        swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&playerapiid="+playerName,
                divName, width.toString(), height.toString(), "8", null, null, params, atts);
        //regular version
        /*swfobject.embedSWF("http://www.youtube.com/e/aNgylQeNzw8?enablejsapi=1&playerapiid="+playerName,
            divName, width, height, "8", null, null, params, atts);*/
    },

    setVisible : function(player) {
        if (player.visible == true) {
            return;
        }
        player.height = this.height;
        player.width = this.width;
        player.className = "playing";
        if (this.muted) {
            player.mute();
        } else {
            player.unMute();
        }
        player.visible = true;
        player.playVideo();
    },

    setHidden : function(player) {
        if (player.visible == false) {
            return;
        }
        player.width = 1;
        player.height = 0;
        player.className = "";
        player.mute();
        player.visible = false;
    },

    playSound : function( url ){
        if (url) {
            document.getElementById("soundplayer").innerHTML="<embed src='"+url+"' hidden=true autostart=true loop=false>";
        }
    },

    //this will queue up the next video and then toggle once it is buffered
    //vidID:String
    play : function(vidID, seekTime) {
        //determine the player to use as a buffer
        if (!this.ready) {
            return false;
        }
        console.log("Playing " + vidID + " in " + this.buffering.id);
        if (seekTime) {
            this.buffering.loadVideoById(vidID, seekTime);
        } else {
            this.buffering.loadVideoById(vidID);
        }
        //store the id with the player
        this.vids[this.buffering.id] = vidID;
        return true;
    },

    //mutes the player
    mute : function() {
        if (!this.ready) {
            return;
        }

        this.buffering.mute();
        this.current.mute();
        this.back.mute();

        this.muted = true;

    },

    unMute : function() {
        if (!this.ready) {
            return;
        }

        if (this.current.visible) {
            this.current.unMute();
        } else if (this.back.visible) {
            this.back.unMute();
        }

        this.muted = false;
    },

    swap : function(a, b) {
        var tmp = this[b];
        this[b] = this[a];
        this[a] = tmp;
    },

    //this is called when a video is done buffering and ready to be played
    performStateTransition : function() {
        if (this.current.visible) {
            //we are looking at the live screen we need to switch unless we are holding
            if (!this.holdState) {
                // adjust the names of the players to reflect their states
                this.swap('current', 'buffering');
                this.swap('buffering', 'back');

                this.setHidden(this.back);
                this.setHidden(this.buffering);
                this.back.pauseVideo();
                this.setVisible(this.current);

            } else {
                //we should put the video in the back state
                this.swap('current', 'buffering');
                this.swap('buffering', 'back');
                this.setVisible(this.back);
                this.setHidden(this.current);
            }
        } else if (this.back.visible) {
            //we are in a back state, we should swap out the others
            this.swap('current', 'buffering');
            this.setHidden(this.buffering);
            this.setHidden(this.current);
            this.buffering.pauseVideo();
        } else {
            //we should never hit this
            //alert("Looking at the buffering screen!");
        }

        this.printPlayers();

        if (this.firstVideo) {
            if (this.onStart) {
                this.onStart();
            }
            this.firstVideo = false;
        }

    },

    printPlayers : function() {
        function playerToString(player) {
            return player.id + "\t" + player.width + "\tvisible:" + player.visible;
        }

        console.log("cur:\t" + playerToString(this.current));
        console.log("buf:\t" + playerToString(this.buffering));
        console.log("back:\t" + playerToString(this.back));
    },

    hold : function() {
        if (!this.current.visible) {
            //alert("trying to hold when not viewing current state!");
            return;
        }
        this.holdState = true;
    },

    goBack : function() {
        if (this.back.visible) {
            return;
        }
        if (this.current.visible) {
            this.setVisible(this.back);
            this.setHidden(this.current);
            this.setHidden(this.buffering);
            this.printPlayers();
        }
        else {
            //alert("goBack: impossible state!");
        }
    },

    resume : function() {
        this.holdState = false;
        if (this.current.visible) {
            return;
        }
        if (this.back.visible) {
            this.setVisible(this.current);
            this.setHidden(this.back)
            this.setHidden(this.buffering);
            this.back.pauseVideo();
        }
        else {
            //alert("impossible state!");
        }
        this.printPlayers();
    },

    backVid : function() {
        if (!this.ready) {
            return '';
        }
        return this.vids[this.back.id];
    },

    currentVid : function() {
        if (!this.ready) {
            return '';
        }
        return this.vids[this.current.id];
    },

    visibleVid : function() {
        if (!this.ready) {
            return '';
        }
        if (this.back.visible) {
            return this.vids[this.back.id];
        }
        if (this.current.visible) {
            return this.vids[this.current.id];
        }
        return '';
    }
}

/*
    YouTube functions
*/

var ytStates = {
    '-1':'unstarted',
    '0':'ended',
    '1':'playing',
    '2':'paused',
    '3':'buffering',
    '5':'cued'
    };

var ytErrors = {
    '2':'invalid vid',
    '100':'video not found',
    '101':'embedded not allowed',
    '150':'embedded not allowed'
    };

function onYouTubePlayerReady(playerId) {
    SmoothPlayer.count += 1;

    var player = document.getElementById(playerId);

    //we have to make these callbacks global because swfobjects need functions
    //to be passed by string
    var stateFn = "ytOnStateChange" + playerId;
    window[stateFn] = function(state) {ytStateHelper(player, state);};
    var errorFn = "ytOnError" + playerId;
    window[errorFn] = function(error) {console.log("Error on p1: " + ytErrors[error]);};

    player.addEventListener("onStateChange", stateFn);
    player.addEventListener("onError", errorFn);

    if (SmoothPlayer.count == 3) {
        //init the states -- should be the last time we use these ids directly
        SmoothPlayer.current = document.getElementById("p1");
        SmoothPlayer.buffering = document.getElementById("p2");
        SmoothPlayer.back = document.getElementById("p3");

        //hide and show
        SmoothPlayer.setVisible(SmoothPlayer.current);
        SmoothPlayer.setHidden(SmoothPlayer.buffering);
        SmoothPlayer.setHidden(SmoothPlayer.back);

        SmoothPlayer.ready = true;
        //console.log("SmoothPlayer ready");
        SmoothPlayer.printPlayers();
        if (SmoothPlayer.onReady) {
            SmoothPlayer.onReady();
        }
    }
}

function ytStateHelper(player, state) {
    state = ytStates[state];
    if (SmoothPlayer.buffering == player) {
        //console.log(player.id + " state change: " + ytStates[state]);
        if (state == 'playing') {
            SmoothPlayer.performStateTransition();
        }
    }
    if (player.visible) {
        //console.log(player.id + " state change: " + ytStates[state]);
        if (state == 'ended' && (SmoothPlayer.holdState || player == SmoothPlayer.back)) {
            SmoothPlayer.resume();
            if (SmoothPlayer.onResume) {
                SmoothPlayer.onResume();
            }
        }
        if (state == 'cued') { //this happens if someone presses the YouTube logo and gets redirected
            player.playVideo();
        }
    }
}
