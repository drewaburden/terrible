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

var extra = 0;
var play_cards = [];

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
  log(data);
});

/*******************************************************************************
* state change handling
*/
s.on('state', function (data) {
  log('new game state: ' + data);
  switch(data[0]) {
    case s_lobby: $('#black_text').text('Waiting for players...'); break;
    case s_playing: clear_center(); update_black(data[1]); break;
    case s_judging: clear_center(); break;
    default: break;
  }
});

/*******************************************************************************
* event handling
*/
s.on('event', function (data) {
  log('player event: ' + data);
  switch(data[0]) {
    case e_draw: add_hand(data[1]); break;
    case e_play: add_blank(); break;
    case e_show: add_whites(data[1], data[2]); break;
    default: break;
  }
});


/*******************************************************************************
* set the current black card
*/
function update_black(id) {
  $('#black_text').text(blacks[id][0]);
  extra = blacks[id][1];
  if (extra > 0) {
    $('#black_extra').text('draw ' + (extra + 1));
    $('#black_extra').removeClass('hidden');
  } else {
    $('#black_extra').addClass('hidden');
  }
}

/*******************************************************************************
* adds a received card to the user's hand
*/
function add_hand(id) {
  var html = '<div class="card white" onclick="prepare_to_play($(this))" ';
  html += 'white_id="' + id + '">' + whites[id] + '</div>';
  $('#right').append(html);
}

/*******************************************************************************
* staging for playing a set of cards
*/
function prepare_to_play(card_element) {
  var id = parseInt(card_element.attr('white_id'));
  play_cards.push(id);
  card_element.remove();
  if (play_cards.length == extra + 1) {
    play(play_cards);
    play_cards = [];
  }
}

/*******************************************************************************
* clears the center pane
*/
function clear_center() {
  // TODO: why does calling this reset the game
  $('#center').empty();
}

/*******************************************************************************
* adds a blank card to the center
*/
function add_blank() {
  $('#center').append('<div class="cards"><div class="card white">&nbsp;</div></div>');
}

/*******************************************************************************
* adds judgeable whites to the center
*/
function add_whites(user, cards) {
  var html = '<div class="cards" onclick="pick(\'' + user + '\')">';
  for (var i = 0; i < cards.length; i++) {
    html += '<div class="card white">' + whites[cards[i]] + '</div>';
  }
  html += '</div>';
  $('#center').append(html);
}


/*******************************************************************************
* click handlers
*/
/*$('body').on('click', '.cards', function(event) {
  alert('hi');
  //pick($(this).attr('player'));
});*/