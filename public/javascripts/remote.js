/*	james thompson
	jham.es/m2
	feed of the present: interface engine.
*/
var currentId="";
var t;
var back=1;
var hold=1;
var live=1;
var mute=0;
var power=1;

$(document).ready(function() {

  $('#live').tooltip({
    title:'Continue the live stream  →',
    delay:{show:100, hide:100},
    container:".tooltip-container",
    placement:'bottom'
  });
  $('#hold').tooltip({
    title:'Hold this video  ↓',
    delay:{show:100, hide:100},
    container:".tooltip-container",
    placement:'bottom'
  });
  $('#back').tooltip({
    title:'Return to the last video  ←',
    delay:{show:100, hide:100},
    container:".tooltip-container",
    placement:'bottom'
  });
  $('#share-video').tooltip({
    title:'Share this video on Twitter',
    delay:{show:100, hide:100},
    container:".tooltip-container",
    placement:'bottom'
  });
  $('#power-button').tooltip({
    title:'On/Off',
    delay:{show:100, hide:100},
    container:".tooltip-container",
    placement:'bottom'
  });
  $('#share-app').tooltip({
    title:'Share Astronaut on Twitter',
    delay:{show:100, hide:100},
    container:".tooltip-container",
    placement:'bottom'
  });

  if (config.sharedVid) {
    console.log("Received shared vid");
    SmoothPlayer.init("smooth",960,540, playSharedVid, OnResume, OnStart);
  } else {
    SmoothPlayer.init("smooth",960,540, initSocket, OnResume, OnStart);
  }


	//initialize buttons to the default state
	livePressed();
	$("#mute").animate({opacity:0.5},1000);

	$("#mute").hover
		(function() {
			//$(this).animate({opacity:1.0},200);
		},
		function() {
			//$(this).animate({opacity:0.5},200);
	});

  $('#smooth').css({opacity:0});

	//this is the controller for the buttons
  $("#power-button").click(function() {
    powerPressed();
  });
	$("#back").click(function() {
		backPressed();
		var backid = SmoothPlayer.backVid();
	});
	$("#hold").click(function() {
		holdPressed();
	});
	$("#live").click(function() {
		livePressed();
	});

	$("#mute").click(function () {
		mutePressed();
	});

  $('#share-video').click(function(event) {
    var width  = 575,
        height = 400,
        left   = ($(window).width()-width)/2,
        top    = ($(window).height()-height)/2,
        url    = 'https://twitter.com/intent/tweet?original_referer=http%3A%2F%2Fastronaut.io%2F&text=I%20found%20this%20video%20on%20Astronaut:&tw_p=tweetbutton&url=http%3A%2F%2Fastronaut.io/v/'+SmoothPlayer.visibleVid()+'&via=astronautio',
        opts   = 'status=1' +
                 ',width='  + width  +
                 ',height=' + height +
                 ',top='    + top    +
                 ',left='   + left;

    window.open(url, 'twitter', opts);

    return false;
  });

  $('#share-app').click(function(event) {
    var width  = 575,
        height = 400,
        left   = ($(window).width()-width)/2,
        top    = ($(window).height()-height)/2,
        url    = 'https://twitter.com/intent/tweet?original_referer=http%3A%2F%2Fastronaut.io%2F&text=Check%20out%20Astronaut:&tw_p=tweetbutton&url=http%3A%2F%2Fastronaut.io%2F&via=astronautio',
        opts   = 'status=1' +
                 ',width='  + width  +
                 ',height=' + height +
                 ',top='    + top    +
                 ',left='   + left;

    window.open(url, 'twitter', opts);

    return false;
  });

	//this is the listener for keypresses
	$('body').keydown(function(event) {
		console.log(event.which);
        if (event.which == 77) { //detect 'm'
          mutePressed();
        }
        else if (event.which == 37) { // detect 'left'
        	backPressed();
        }
        else if (event.which == 40) { //detect 'down'
          event.preventDefault();
        	holdPressed();
        }
        else if (event.which == 39) { //detect 'right'
        	livePressed();
        }
    });
});

function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " yrs";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hrs";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " min";
    }
    return Math.floor(seconds) + " sec";
}

function buildSummary() {
  // builds the summary videos
  var videos = SmoothPlayer.seenVideos().slice(-5);
  videos = videos.map(function(video) {
    return {
      id: video.id,
      viewCount: video.viewCount,
      uploaded: timeSince(new Date(video.uploaded)) + ' ago',
      action: video.action
    };
  });

  var source   = $("#summary-template").html();
  var template = Handlebars.compile(source);
  var context = {videos: videos };
  var html    = template(context);
  $('#summary').html(html);
}

function powerPressed() {
  if (power==1) {
    $("#power-button").addClass("powered-down");
    SmoothPlayer.setRecording(false);
    buildSummary();
    $('#summary').css('display', 'inline');
    mutePressed();
    //SmoothPlayer.resume();
    power=0;
  }
  else {
    $("#power-button").removeClass("powered-down");
    $('#summary').css('display', 'none');
    SmoothPlayer.setRecording(true);
    mutePressed();
    //SmoothPlayer.pause();
    power=1;
  }
}

function mutePressed() {
	if (mute==0) {
		$("#mute").html("SOUND");
		$("#mute").css({"text-decoration":"line-through"});
    $("#control-status-message").addClass("muted");
		SmoothPlayer.mute();
		mute=1;
	}
	else {
		$("#mute").html("((( SOUND )))");
		$("#mute").css({"text-decoration":"none"});
    $("#control-status-message").removeClass("muted");
		SmoothPlayer.unMute();
		mute=0;
	}
}

function holdPressed() {
	if (hold) {
    console.log("holding");
		SmoothPlayer.hold();
    $("#back").attr("class","control-button hold-pressed");
    $("#hold").attr("class","control-button inactive pressed");
    $("#live").attr("class","control-button hold-pressed");
    $("#control-status-live").css({"background-color":"rgba(0,0,0,0.1)"});
    $("#control-status-message").html("Holding current video");
		//$("#back").animate({opacity:0.5},100);
		//$("#hold").animate({opacity:0.5},100);
		//$("#live").animate({opacity:1.0},400);
		back=1;
		hold=0;
		live=1;
    $('#hold').tooltip('hide');
	}
}

function backPressed() {
	if (back) {
		SmoothPlayer.goBack();
    $("#back").attr("class","control-button inactive pressed");
    $("#hold").attr("class","control-button inactive back-pressed");
    $("#live").attr("class","control-button");
    $("#control-status-live").css({"background-color":"rgba(0,0,0,0.1)"});
    $("#control-status-message").html("Playing previous video");
		//$("#back").animate({opacity:0.5},100);
		//$("#hold").animate({opacity:0.5},100);
		//$("#live").animate({opacity:1.0},400);
		back=0;
		hold=0;
		live=1;
    $('#back').tooltip('hide');
	}
}

function livePressed() {
	if (live) {
    if (SmoothPlayer.ready) {
		  SmoothPlayer.resume();
    }
    $("#back").attr("class","control-button");
    $("#hold").attr("class","control-button live-pressed");
    $("#live").attr("class","control-button inactive pressed");
    $("#control-status-live").css({"background-color":"red"});
    $("#control-status-message").html("Live Stream");
		//$("#back").animate({opacity:1.0},400);
		//$("#hold").animate({opacity:1.0},400);
		//$("#live").animate({opacity:0.5},100);
		back=1;
		hold=1;
		live=0;
    $('#live').tooltip('hide');
	}
}

function onExit() {
}

function initSocket() {
    var socket = io.connect();
    //establish a command pattern on the server to parse out messages
    socket.on('video', function(data) {
        console.log(data);
        processVideo(data);
    });
}

function playSharedVid() {
  SmoothPlayer.play(config.sharedVid, 0);
}

function processVideo(data) {
  console.log('processVideo', data);
    if (currentId!=data.video.id) {
        var currentTime = (new Date())/1000;
        var seekTime = (currentTime < data.time) ? 0 : (currentTime - data.time);
        seekTime += data.offset;
        SmoothPlayer.play(data.video, seekTime);
        currentId=data.video.id;
    }
}

function OnResume() {
	livePressed();
}

function OnStart() {
  $('#smooth').animate({opacity:1}, 2000, function() {
    $("#smooth-container").css({"background-color": "#000"});
  });

  if (config.sharedVid) {
    // hold the video for a shared video and then start buffering incoming
    // videos. when the held video is done it will immediately switch to the
    // next incoming video
    holdPressed();
    initSocket();
  }
}
