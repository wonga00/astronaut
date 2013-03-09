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

$(document).ready(function() {
	
	SmoothPlayer.init("smooth",853,480, initSocket, OnResume);
	
	//initialize buttons to the default state
	livePressed();
	$("#mute").animate({opacity:0.5},1000);
	
	$("#mute").hover
		(function() {
			$(this).animate({opacity:1.0},200);
		},
		function() {
			$(this).animate({opacity:0.5},200);
	});

	//this is the controller for the buttons
	$("#back").click(function() {
		backPressed();
		var backid = SmoothPlayer.backVid();
	});
	$("#hold").click(function() {
		holdPressed();
		var currid = SmoothPlayer.currentVid();
	});
	$("#live").click(function() {
		livePressed();
	});
	
	$("#mute").click(function () { 
		mutePressed();
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
        	holdPressed();
        }
        else if (event.which == 39) { //detect 'right'
        	livePressed();
        }
    });
});

function mutePressed() {
	if (mute==0) {
		$("#mute").html("SOUND");
		$("#mute").css({"text-decoration":"line-through"})
		SmoothPlayer.mute();
		mute=1;
	}
	else {
		$("#mute").html("((( SOUND )))");
		$("#mute").css({"text-decoration":"none"})
		SmoothPlayer.unMute();	
		mute=0;
	}
}

function holdPressed() {
	if (hold) {
		SmoothPlayer.hold();
		$("#back").css({"cursor":"default"});
		$("#hold").css({"cursor":"default"});
		$("#live").css({"cursor":"pointer"});
		$("#back").animate({opacity:0.5},100);
		$("#hold").animate({opacity:0.5},100);
		$("#live").animate({opacity:1.0},400);
		back=0;
		hold=0;
		live=1;
	}
}

function backPressed() {
	if (back) {
		SmoothPlayer.goBack();
		$("#back").css({"cursor":"default"});
		$("#hold").css({"cursor":"default"});
		$("#live").css({"cursor":"pointer"});
		$("#back").animate({opacity:0.5},100);
		$("#hold").animate({opacity:0.5},100);
		$("#live").animate({opacity:1.0},400);
		back=0;
		hold=0;
		live=1;
	}
}

function livePressed() {
	if (live) {
		SmoothPlayer.resume();
		$("#back").css({"cursor":"pointer"});
		$("#hold").css({"cursor":"pointer"});
		$("#live").css({"cursor":"default"});
		$("#back").animate({opacity:1.0},400);
		$("#hold").animate({opacity:1.0},400);
		$("#live").animate({opacity:0.5},100);
		back=1;
		hold=1;
		live=0;
	}
}

function onExit() {
}
    
function IdHandler(title,id,startTime) {
	if (currentId!=id) {
		var currentTime = (new Date())/1000;
    	SmoothPlayer.play(id, currentTime-startTime);
    	currentId=id;
	}
}

function initSocket() {
    var socket = io.connect();
    //establish a command pattern on the server to parse out messages
    socket.on('vid', function(data) {
        console.log(data);
        processVid(data.vid, data.time);
    });
}

function processVid(vid, time) {
    if (currentId!=vid) {
        var currentTime = (new Date())/1000;
        SmoothPlayer.play(vid, currentTime-time);
        currentId=vid;
    }
}

function OnResume() {
	livePressed();
}
