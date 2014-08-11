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
function init() {
  $.getJSON("blacks.json", function (data) {
    blacks = data;
  });
  $.getJSON("whites.json", function (data) {
    whites = data;
  });
}

/*******************************************************************************
* shorthand for multiple request types
*/
function request(payload) {
  s.emit("req", payload);
}

function join(username) {
  s.emit("req", [e_join, username]);
}

function play(cards) {
  s.emit("req", [e_play, cards]);
}

function pick(user) {
  s.emit("req", [e_pick, user]);
}

function quit() {
  s.emit("req", [e_quit]);
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
});

/*******************************************************************************
* event handling
*/
s.on('event', function (data) {
  console.log('player event: ' + data);
});