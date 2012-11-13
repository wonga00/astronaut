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


    todo: push more free functions into SmoothPlayer package
*/


var SmoothPlayer = {
    count : 0,
    height : 356,
    width : 425,
    muted : false,
    ready : false,
    holdState : false,
    //dictionary of video ids : player id <-> video id
    vids : {},

    //the id of the currently visible state
    visible : undefined,

    //possible players
    current : undefined,
    back : undefined,
    buffering : undefined,

    init : function(divname, width, height, readyCb, resumeCb, soundurl) {
        this.soundurl = soundurl;
        if (width) {
            this.width = width;
        }
        if (height) {
            this.height = height;
        }
        this.readycb = readyCb;
        this.onresume = resumeCb;
        var frame = document.getElementById(divname);
        frame.innerHTML = "<div id =\"smoothplay_1\"></div><div id=\"smoothplay_2\"></div><div id=\"smoothplay_3\"></div><div id=\"soundplayer\"></div>";
        this.createPlayer("smoothplay_1","p1", this.width, this.height);
        this.createPlayer("smoothplay_2","p2", 1, 1);
        this.createPlayer("smoothplay_3","p3", 1, 1);
    },

    createPlayer : function(divName, playerName, width, height) {
        var params = { allowScriptAccess: "always" };
        var atts = { id: playerName}
        //chrome-less version
        swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&playerapiid="+playerName,
                divName, width.toString(), height.toString(), "8", null, null, params, atts);
        //regular version
        /*swfobject.embedSWF("http://www.youtube.com/e/aNgylQeNzw8?enablejsapi=1&playerapiid="+playerName,
            divName, width, height, "8", null, null, params, atts);*/
    },

    setVisible : function(player) {
        player.height = this.height;
        player.width = this.width;
        if (this.muted) {
            player.mute();
        } else {
            player.unMute();
        }
    },

    setHidden : function(player) {
        player.width = 1;
        player.height = 1;
        player.mute();
    },

    playSound : function( url ){
        if (url) {
            console.log("playing sound" + url);
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
        this.visible.unMute();

        this.muted = false;
    },

    onReady : function() {
        if (this.visible == this.current) {
            //we are looking at the live screen we need to switch unless we are holding
            if (!this.holdState) {
                this.setVisible(this.buffering);
                this.setHidden(this.current);
                this.current.pauseVideo();
                
                //current <-> buffering
                var tmp = this.buffering;
                this.buffering = this.current;
                this.current = tmp;
                this.visible = this.current;

                //buffering <-> back
                tmp = this.back;
                this.back = this.buffering;
                this.buffering = tmp;
            } else {
                //we should put the video in the back state
                //current <--> back
                var tmp = this.back;
                this.back = this.current;
                this.current = tmp;
                this.visible = this.back;
                this.setVisible(this.back);
                this.setHidden(this.current);

                //current <--> buffering
                tmp = this.buffering;
                this.buffering = this.current;
                this.current = tmp;
            }
        } else if (this.visible == this.back) { //we are in a back state, we should swap out the others
            //current <-> buffering
            var tmp = this.buffering;
            this.buffering = this.current;
            this.current = tmp;

            this.buffering.pauseVideo();
        } else {
            //we should never hit this
            alert("Looking at the buffering screen!");
        }
        if (this.playCallback) {
            this.playCallback();
        }
        console.log("onReady");
        this.printPlayers();

    },
    
    printPlayers : function() {
        console.log("vis:\t" + playerToString(this.visible));
        console.log("cur:\t" + playerToString(this.current));
        console.log("buf:\t" + playerToString(this.buffering));
        console.log("back:\t" + playerToString(this.back));
    },

    hold : function() {
        if (this.visible != this.current) {
            //alert("trying to hold when not viewing current state!");
            return;
        }
        this.holdState = true;
    },

    goBack : function() {
        if (this.visible == this.back) {
            return;
        }
        if (this.visible == this.current) {
            this.setVisible(this.back);
            this.back.playVideo();
            this.setHidden(this.current);
            this.visible = this.back;
            this.printPlayers();
        }
        else {
            //alert("goBack: impossible state!");
        }
    },
    
    resume : function() {
        this.holdState = false;
        if (this.visible == this.current) {
            return;
        }
        if (this.visible == this.back) {
            this.setVisible(this.current);
            //this.current.playVideo();
            this.setHidden(this.back)
            this.back.pauseVideo();
            this.visible = this.current;
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
    }
}

/*
    debug utilities
*/

function playerToString(player) {
    return player.id + " " + player.width;
}

//use these as references to the original players
var p1, p2, p3;

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

    if (playerId == "p1") {
        player.addEventListener("onStateChange", "onStateChange_1");
        player.addEventListener("onError","onError_1");
    }
    else if (playerId == "p2") {
        player.addEventListener("onStateChange", "onStateChange_2");
        player.addEventListener("onError","onError_2");
    }
    else {
        player.addEventListener("onStateChange", "onStateChange_3");
        player.addEventListener("onError","onError_3");
    }

    if (SmoothPlayer.count == 3) {
        //init the states -- should be the last time we use these ids directly
        p1 = SmoothPlayer.current = document.getElementById("p1");
        p2 = SmoothPlayer.buffering = document.getElementById("p2");
        p3 = SmoothPlayer.back = document.getElementById("p3");
        SmoothPlayer.visible = SmoothPlayer.current;

        //hide and show
        SmoothPlayer.setVisible(SmoothPlayer.current);
        SmoothPlayer.setHidden(SmoothPlayer.buffering);
        SmoothPlayer.setHidden(SmoothPlayer.back);

        SmoothPlayer.ready = true;
        //console.log("SmoothPlayer ready");
        SmoothPlayer.printPlayers();
        if (SmoothPlayer.readycb) {
            SmoothPlayer.readycb();
        }
    }
}

function stateHelper(player, state) {
    if (SmoothPlayer.buffering == player) {
        //console.log(player.id + " state change: " + ytStates[state]);
        if (state == 1) {
            SmoothPlayer.onReady();
        }
    }
    if (SmoothPlayer.visible == player) {
        //console.log(player.id + " state change: " + ytStates[state]);
        if (state == 0 && (SmoothPlayer.holdState || player == SmoothPlayer.back)) {
            SmoothPlayer.resume();
            if (SmoothPlayer.onresume) {
                SmoothPlayer.onresume();
            }
        }
        if (state == 5) { //this happens if someone presses the YouTube logo and gets redirected
            player.playVideo();
        }
    }
}

function onStateChange_1(state) {
    stateHelper(p1, state);
}

function onStateChange_2(state) {
    stateHelper(p2, state);
}

function onStateChange_3(state) {
    stateHelper(p3, state);
}

function onError_1(error) {
    console.log("Error on p1: " + ytErrors[error]);
}

function onError_2(error) {
    console.log("Error on p2: " + ytErrors[error]);
}

function onError_3(error) {
    console.log("Error on p3: " + ytErrors[error]);
}
