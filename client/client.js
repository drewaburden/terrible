var s = io('/');

var blacks, whites;

function log(text) {
  console.log(text);
}

var state;
var my_username;
var extra = 0;
var play_cards = [];
var current_judge;
var played;

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
  state = global.STATES.INIT;
}

/*******************************************************************************
* shorthand for multiple request types
*/
function request(payload) {
  s.emit("req", payload);
}

function join(username) {
  my_username = username;
  s.emit("req", [global.EVENTS.JOIN, username]);
  $('#overlay').addClass('hidden');
  $('#overlay_join').addClass('hidden');
}

function play(cards) {
  s.emit("req", [global.EVENTS.PLAY_CARDS, cards]);
}

function pick(user) {
  s.emit("req", [global.EVENTS.PICK_WINNER, user]);
}

/*function quit() {
  s.emit("req", [global.EVENTS.QUIT]);
  $('#overlay_join').removeClass('hidden');
  $('#overlay').removeClass('hidden');
}*/

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
  state = data[0];
  switch(state) {
    case global.STATES.LOBBY: $('#black_text').text('Waiting for players...'); break;
    case global.STATES.PLAYING: roundInit(data[1]); break;
    case global.STATES.JUDGING: enterJudging(); break;
    case global.STATES.INTERMISSION: winnerPicked(data[1]); break;
    default: break;
  }
});

/*******************************************************************************
* event handling
*/
s.on('event', function (data) {
  log('player event: ' + data);
  switch(data[0]) {
    case global.EVENTS.JOIN: addUser(data[1]); break;
    case global.EVENTS.QUIT: $("[user='" + data[1] + "']").remove(); break;
    case global.EVENTS.DRAW_CARD: add_hand(data[1]); break;
    case global.EVENTS.PLAY_CARDS: add_blank(); break;
    case global.EVENTS.SHOW_CARDS: add_whites(data[1], data[2]); break;
    case global.EVENTS.ANNOUNCE_JUDGE: setJudge(data[1]); break;
    default: break;
  }
});

/*******************************************************************************
* adds user to scoreboard
*/
function addUser(data) {
  var user = data[0];
  var score = data[1];
  var html = '<div class="card white" user="' + user + '" score="' + score
  html +='">' + user + ' (' + score + ')</div>';
  $('#scores').append(html);
}

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

function roundInit(black) {
  $('#judge_overlay').addClass('hidden');
  $('#played_whites').removeClass('active');
  $('#hand').addClass('active');
  $('.highlighted').removeClass('highlighted');
  clear_center();
  update_black(black);
  played = false;
}

/*******************************************************************************
* set the current judge
*/
function setJudge(username) {
  current_judge = username;
  // place screen over hand if judge
  if (my_username == current_judge) {
    $('#judge_overlay').removeClass('hidden');
  }
}

/*******************************************************************************
* enters judging
*/
function enterJudging() {
  clear_center();
  if (my_username == current_judge) {
    $('#played_whites').addClass('active');
  }
}

/*******************************************************************************
* adds a received card to the user's hand
*/
function add_hand(id) {
  var html = '<div class="card white" onclick="prepare_to_play($(this))" ';
  html += 'white_id="' + id + '">' + whites[id] + '</div>';
  $('#hand').append(html);
}

/*******************************************************************************
* staging for playing a set of cards
*/
function prepare_to_play(card_element) {
  if (state != global.STATES.PLAYING || current_judge == my_username
    || played) {
    return;
  }
  var id = parseInt(card_element.attr('white_id'));
  play_cards.push(id);
  card_element.remove();
  if (play_cards.length == extra + 1) {
    play(play_cards);
    play_cards = [];
    $('#hand').removeClass('active');
    played = true;
  }
}

/*******************************************************************************
* clears the center pane
*/
function clear_center() {
  $('#played_whites').empty();
}

/*******************************************************************************
* adds a blank card to the center
*/
function add_blank() {
  $('#played_whites').append('<div class="cards"><div class="card white">&nbsp;</div></div>');
}

/*******************************************************************************
* adds judgeable whites to the center
*/
function add_whites(user, cards) {
  var html = '<div class="cards" user="' + user + '" onclick="pick(\'' + user;
  html += '\')">';
  for (var i = 0; i < cards.length; i++) {
    html += '<div class="card white">' + whites[cards[i]] + '</div>';
  }
  html += '</div>';
  $('#played_whites').append(html);
}

/*******************************************************************************
* winner was picked, highlight them
*/
function winnerPicked(user) {
  var winning_cards = $("#played_whites [user='" + user + "']").addClass('highlighted');
  var user_tile = $("#scores [user='" + user + "']");
  user_tile.addClass('highlighted');
  user_tile.attr('score', parseInt(user_tile.attr('score')) + 1);
  var new_text = user_tile.attr('user') + ' (' + user_tile.attr('score') + ')';
  user_tile.text(new_text);
}