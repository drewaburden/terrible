var s = io('/');

var prompts = null;
var responses = null;

function log(text) {
  console.log(text);
}

var state;
var my_username;
var extra = 0;
var play_cards = [];
var current_judge;
var played;
var focused = true;

var audio_delay = 30000; // in ms
var audio_lock;
var use_audio = true;

/*******************************************************************************
* here we load the cards
*/
function receiveDeck(data) {
  prompts = data[0];
  responses = data[1];
}

/*******************************************************************************
* shorthand for multiple request types
*/
function request(payload) {
  s.emit("req", payload);
}

function join(username) {
  if (prompts == null || responses == null) {
    alert('Still receiving deck from server.');
    return;
  }
  state = global.STATES.INIT;
  my_username = username;
  s.emit("req", [global.EVENTS.JOIN, username]);
  $('#overlay').addClass('hidden');
  $('#overlay_join').addClass('hidden');
}

function play(cards) {
  clearTimeout(audio_lock);
  s.emit("req", [global.EVENTS.PLAY_CARDS, cards]);
}

function pick(user) {
  clearTimeout(audio_lock);
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
  clearTimeout(audio_lock);
  state = data[0];
  switch(state) {
    case global.STATES.LOBBY: stateLobby(); break;
    case global.STATES.PLAYING: statePlaying(data[1]); break;
    case global.STATES.JUDGING: stateJudging(); break;
    case global.STATES.INTERMISSION: stateIntermission(data[1]); break;
    default: break;
  }
});

s.on('disconnect', function (data) {
  $('#overlay_join').addClass('hidden');
  $('#overlay').removeClass('hidden');
  $('#overlay_lost_connection').removeClass('hidden');
});

/*******************************************************************************
* returned to lobby
*/
function stateLobby() {
  resetVisualState();
  $('#black_text').text('Waiting for players...');
}

/*******************************************************************************
* the round has started, set the prompt card
*/
function statePlaying(prompt_id) {
  resetVisualState();
  $('#hand').addClass('active');
  played = false; 

  // set the prompt card
  var text = prompts[prompt_id][0];
  if (prompts[prompt_id][1].length > 0) {
    text += '<br><span class="subtext">' + prompts[prompt_id][1] + '</span>';
  }
  $('#black_text').html(text);
  extra = prompts[prompt_id][2];
  if (extra > 0) {
    $('#black_extra').text('play ' + (extra + 1));
    $('#black_extra').removeClass('hidden');
  }
}

/*******************************************************************************
* judging started
*/
function stateJudging() {
  clearCenter();
  if (my_username == current_judge) {
    $('#played_whites').addClass('active');
    audio_lock = setTimeout(audioNotify, audio_delay);
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
  // don't want to log the entire deck to console
  if (data[0] != global.EVENTS.SEND_DECK) {
    log('player event: ' + data);
  } else {
    log('player event: received deck');
  }
  switch(data[0]) {
    case global.EVENTS.JOIN: addUser(data[1]); break;
    case global.EVENTS.NAME: my_username = data[1]; break;
    case global.EVENTS.QUIT: $("[user='" + data[1] + "']").remove(); break;
    case global.EVENTS.SYNC_HAND: syncHand(data[1]); break;
    case global.EVENTS.PLAY_CARDS: addBlank(); break;
    case global.EVENTS.SHOW_CARDS: addResponses(data[1], data[2]); break;
    case global.EVENTS.ANNOUNCE_JUDGE: setJudge(data[1]); break;
    case global.EVENTS.UPDATE_STATE: updateToState(data[1]); break;
    case global.EVENTS.SEND_DECK: receiveDeck(data[1]); break;
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
  $('#black_extra').addClass('hidden');
  $('#judge_overlay').addClass('hidden');
  $('#played_whites').removeClass('active');
  $('.highlighted').removeClass('highlighted');
  $('.judging').removeClass('judging');
  clearCenter();
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
  // set notification timer for all other players
  else {
    audio_lock = setTimeout(audioNotify, audio_delay);
  }
}

/*******************************************************************************
* adds a received card to the user's hand
*/
function syncHand(hand) {
  var html = '';
  for (var i = 0; i < hand.length; i++) {
    html += '<div class="card white" onclick="prepareToPlay($(this))" ';
    html += 'white_id="' + hand[i] + '">' + responses[hand[i]][0]
    if (responses[hand[i]][1].length > 0) {
          html += '<br><span class="subtext">' + responses[hand[i]][1];
          html += '</span>';
    }
    html += '</div>';
  }
  $('#hand').html(html);
}

/*******************************************************************************
* staging for playing a set of cards
*/
function prepareToPlay(card_element) {
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
function clearCenter() {
  $('#played_whites').empty();
}

/*******************************************************************************
* adds a blank card to the center
*/
function addBlank() {
  var html = '<div class="cards"><div class="card white">&nbsp;</div></div>';
  $('#played_whites').append(html);
}

/*******************************************************************************
* adds judgeable responses to the center
*/
function addResponses(user, cards) {
  var html = '<div class="cards" user="' + user + '" onclick="pick(\'' + user;
  html += '\')">';
  for (var i = 0; i < cards.length; i++) {
    html += '<div class="card white">' + responses[cards[i]][0];
    if (responses[cards[i]][1].length > 0) {
      html += '<br><span class="subtext">' + responses[cards[i]][1] + '</span>';
    }
    html += '</div>';
  }
  html += '</div>';
  $('#played_whites').append(html);
}


/*******************************************************************************
* updates the client's UI to the latest game state given in the data
*/
function updateToState(gamestate) {
  //update the UI here
}

/*******************************************************************************
* plays a notification sound
*/
function audioNotify() {
  if (use_audio && !focused) {
    document.getElementById('audio_notification').play();
  }
}

function useAudio(use) {
  use_audio = use;
}

window.onfocus = function() {
    focused = true;
};
window.onblur = function() {
    focused = false;
};