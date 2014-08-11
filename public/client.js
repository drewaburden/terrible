var s = io('/');

// game states
var s_init = -1;
var s_lobby = 0
var s_playing = 1
var s_judging = 2
var s_intermission = 3

// event types
var e_join = 0;
var e_quit = 1;
var e_draw = 2;
var e_play = 3;
var e_show = 4;
var e_pick = 5;
var e_judg = 6;

var blacks, whites;

function log(text) {
  console.log(text);
}

/*******************************************************************************
* here we load the cards
*/
function load() {
  $.getJSON("blacks.json", function (data) {
    blacks = data;
    $.getJSON("whites.json", function (data) {
      whites = data;
      init();
    });
  });
}

/*******************************************************************************
* here we start the game
*/
function init() {
  
}

/*******************************************************************************
* shorthand for multiple request types
*/
function request(payload) {
  s.emit("req", payload);
}

function join(username) {
  s.emit("req", [e_join, username]);
  $('#overlay').addClass('hidden');
  $('#overlay_join').addClass('hidden');
}

function play(cards) {
  s.emit("req", [e_play, cards]);
}

function pick(user) {
  s.emit("req", [e_pick, user]);
}

function quit() {
  s.emit("req", [e_quit]);
  $('#overlay_join').removeClass('hidden');
  $('#overlay').removeClass('hidden');
}

/*******************************************************************************
* message handling
*/
s.on('msg', function (data) {
  console.log(data);
});

/*******************************************************************************
* state change handling
*/
s.on('state', function (data) {
  console.log('new game state: ' + data);
  switch(data[0]) {
    case s_playing: update_black(data[1]); break;
    default: break;
  }
});

/*******************************************************************************
* event handling
*/
s.on('event', function (data) {
  console.log('player event: ' + data);
  switch(data[0]) {
    default: break;
  }
});


/*******************************************************************************
* set the current black card
*/
function update_black(id) {
  $('#black_text').text(blacks[id][0]);
  var extra = blacks[id][1];
  if (extra > 0) {
    $('#black_extra').text('draw ' + (extra + 1));
    $('#black_extra').removeClass('hidden');
  } else {
    $('#black_extra').addClass('hidden');
  }
}