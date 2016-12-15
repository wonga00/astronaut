function SmoothPlayer(div, args) {
    var self = {},
        _count = 0,
        _height = 356,
        _width = 425,
        _muted = false,
        _ready = false,
        _isHold = false,
        _current, // should always be playing
        _back, // can be paused or playing if in a hold state and a new video comes in
        _buffering, // loads the next video. when starting to play it turns into the current
        _onReady,
        _onResume,
        _onStart,
        _firstVideo = true,
        HIDDEN_WIDTH = 1,
        HIDDEN_HEIGHT = 0;


    function init(divname, width, height, onReady, onResume, onStart) {
        _width = width;
        _height = height;
        _onReady = onReady;
        _onResume = onResume;
        _onStart = onStart;
        // inject dom elements to contain the 3 players
        document.getElementById(divname).innerHTML = "<div id =\"p1\"></div><div id=\"p2\"></div><div id=\"p3\"></div>";

        /* create the 3 players , one in exposed state, one in hidden state */
        _current = createPlayer("p1", _width, _height);
        _back = createPlayer("p2", HIDDEN_WIDTH, HIDDEN_HEIGHT);
        _buffering = createPlayer("p3", HIDDEN_WIDTH, HIDDEN_HEIGHT);
    }

    function onPlayerReady() {
        _count += 1;
        if (_count == 3) {
            _ready = true;
            //hide and show -- MIGHT NOT NEED THIS
            setVisible(_current);
            setHidden(_buffering);
            setHidden(_back);

            printPlayers();
            if (_onReady) {
                _onReady();
            }
        }
    }

    function onStateChange(event) {
        var player = event.target,
            state = event.data;

        if ((player == _buffering) && (state == YT.PlayerState.PLAYING)) {
            onBufferingFinished();
        }

        if (player.visible) {
            console.log(player + " state change: " + state);
            if (state == YT.PlayerState.ENDED && (_isHold || player == _back)) {
                resume();
                if (_onResume) {
                    _onResume();
                }
            }
            //this happens if someone presses the YouTube logo and gets redirected
            // if (state == YT.PlayerState.CUED) {
            //     console.log('state change cued');
            //     player.playVideo();
            // }
        }
    }

    function createPlayer(divName, width, height) {
        var p = new YT.Player(divName, {
            height: height,
            width: width,
            playerVars: {
                controls: 0,
                showinfo: 0,
                modestbranding: 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onStateChange
            }
        });
        p.visible = false;
        return p;
    }

    function setVisible(player) {
        // makes the player visible to the user
        // NOTE: visible and current are not the same since you can be looking
        // at the back player

        if (player.visible) {
            return;
        }

        // move it back into the container
        $(player.getIframe()).css({position: '', top: ''});
        /* make the size 100% */
        player.setSize(_width, _height);

        /* muted attribute is mapped to playing */
        if (_muted) {
            player.mute();
        } else {
            player.unMute();
        }
        player.visible = true;
    }

    function setHidden(player) {
        // move it out of the container
        $(player.getIframe()).css({position: 'fixed', top: 0});
        player.setSize(HIDDEN_WIDTH, HIDDEN_HEIGHT);
        player.mute();
        player.visible = false;
    }

    //this will queue up the next video and then toggle once it is buffered
    function play(video, seekTime) {
        //determine the player to use as a buffer
        if (!_ready) {
            return false;
        }

        if (_firstVideo) {
            // warmup all the players
            console.log('warming up');
            _buffering.loadVideoById('q2XBK_PZgWY');
            _buffering.stopVideo();
            _current.loadVideoById('q2XBK_PZgWY');
            _current.stopVideo();
            _back.loadVideoById('q2XBK_PZgWY');
            _back.stopVideo();
        }

        console.log("Playing " + video + " in " + _buffering);
        if (seekTime) {
            _buffering.loadVideoById(video, seekTime);
        } else {
            _buffering.loadVideoById(video);
        }

        return true;
    }

    //mutes the player
    function mute() {
        if (!_ready) {
            return;
        }

        _buffering.mute();
        _current.mute();
        _back.mute();

        _muted = true;
    }

    function unMute() {
        if (!_ready) {
            return;
        }

        if (_current.visible) {
            _current.unMute();
        } else if (_back.visible) {
            _back.unMute();
        }

        _muted = false;
    }

    function swapCurrentBuffering() {
        var tmp = _current;
        _current = _buffering;
        _buffering = tmp;
    }

    function swapBufferingBack() {
        var tmp = _buffering;
        _buffering = _back;
        _back = tmp;
    }

    //this is called when a video is done buffering and ready to be played
    function onBufferingFinished() {
        if (_current.visible) {
            //we are looking at the live screen we need to switch unless we are holding
            if (!_isHold) {
                // adjust the names of the players to reflect their states
                swapCurrentBuffering();
                swapBufferingBack();

                setHidden(_back);
                setHidden(_buffering);
                _back.pauseVideo();
                setVisible(_current);

            } else {
                //we should put the video in the back state
                swapCurrentBuffering();
                swapBufferingBack();
                setVisible(_back);
                setHidden(_current);
                setHidden(_buffering);
            }
        } else if (_back.visible) {
            //we are in a back state, we should swap out the others
            swapCurrentBuffering();
            setHidden(_buffering);
            setHidden(_current);
            setVisible(_back);
            _buffering.pauseVideo();
        } else {
            //we should never hit this
            console.log('onBufferingFinished: on buffering screen!');
        }

        printPlayers();

        if (_firstVideo) {
            if (_onStart) {
                _onStart();
            }
            _firstVideo = false;
        }

    }

    function printPlayers() {
        function playerToString(player) {
            return player + "\t" + player.width + "\tvisible:" + player.visible;
        }

        console.log("cur:\t" + playerToString(_current));
        console.log("buf:\t" + playerToString(_buffering));
        console.log("back:\t" + playerToString(_back));
    }

    function hold() {
        if (!_current.visible) {
            return;
        }
        // maybe rename this to isHeld
        _isHold = true;
    }

    function goBack() {

        if (_back.visible) {
            return;
        }

        if (_current.visible) {
            setVisible(_back);
            setHidden(_current);
            setHidden(_buffering);
            _back.playVideo();
        }
        else {
            console.log("goBack: impossible state!");
        }

        printPlayers();
    }

    function resume() {
        _isHold = false;

        if (_current.visible) {
            return;
        }

        if (_back.visible) {
            setVisible(_current);
            setHidden(_back)
            setHidden(_buffering);
            _back.pauseVideo();
        }
        else {
            console.log("resume: impossible state!");
        }

        printPlayers();
    }

    function playerState() {
        if (_current.visible) {
            if (_isHold) {
                return 'hold';
            }
            return 'live';

        }
        return 'back';
    }

    self.resume = resume;
    self.goBack = goBack;
    self.hold = hold;
    self.mute = mute;
    self.unMute = unMute;
    self.play = play;
    self.playerState = playerState;
    self.printPlayers = printPlayers;
    self.isReady = function() { return _ready;};
    self.current = function() { return _current; };
    self.back = function() { return _back; };
    self.buffering = function() { return _buffering; };
    init(
        div,
        args.width,
        args.height,
        args.onReady,
        args.onResume,
        args.onStart);

    return self;
}
