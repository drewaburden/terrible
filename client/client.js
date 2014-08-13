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

function quit() {
  s.emit("req", [global.EVENTS.QUIT]);
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
  state = data[0];
  switch(state) {
    case global.STATES.LOBBY: stateLobby(); break;
    case global.STATES.PLAYING: statePlaying(data[1]); break;
    case global.STATES.JUDGING: stateJudging(); break;
    case global.STATES.INTERMISSION: stateIntermission(data[1]); break;
    default: break;
  }
});

/*******************************************************************************
* returned to lobby
*/
function stateLobby() {
  resetVisualState();
  $('#black_text').text('Waiting for players...');
}

/*******************************************************************************
* the round has started, set the black card
*/
function statePlaying(black_id) {
  resetVisualState();
  $('#hand').addClass('active');
  played = false; 

  // set the black card
  $('#black_text').text(blacks[black_id][0]);
  extra = blacks[black_id][1];
  if (extra > 0) {
    $('#black_extra').text('draw ' + (extra + 1));
    $('#black_extra').removeClass('hidden');
  } else {
    $('#black_extra').addClass('hidden');
  }
}

/*******************************************************************************
* judging started
*/
function stateJudging() {
  clear_center();
  if (my_username == current_judge) {
    $('#played_whites').addClass('active');
  }
}

/*******************************************************************************
* winner was picked, highlight them
*/
function stateIntermission(user) {
  var winning_cards = $("#played_whites [user='" + user + "']").addClass('highlighted');
  var user_tile = $("#scores [user='" + user + "']");
  user_tile.addClass('highlighted');
  user_tile.attr('score', parseInt(user_tile.attr('score')) + 1);
  var new_text = user_tile.attr('user') + ' (' + user_tile.attr('score') + ')';
  user_tile.text(new_text);
}

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
* sets a number of elements back to default
*/
function resetVisualState() {
  $('#judge_overlay').addClass('hidden');
  $('#played_whites').removeClass('active');
  $('.highlighted').removeClass('highlighted');
  $('.judging').removeClass('judging');
  clear_center();
}

/*******************************************************************************
* set the current judge
*/
function setJudge(username) {
  current_judge = username;
  // highlight judge in scoreboard
  $("#scores [user='" + username + "']").addClass('judging');
  // place screen over hand if judge
  if (my_username == current_judge) {
    $('#judge_overlay').removeClass('hidden');
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
  var html = '<div class="cards"><div class="card white">&nbsp;</div></div>';
  $('#played_whites').append(html);
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