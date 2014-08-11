var _ = require('./underscore');

// game states
var s_init = -1;
var s_lobby = 0
var s_playing = 1
var s_judging = 2
var s_intermission = 3

// request types
var r_join = 0;
var r_quit = 1;
var r_play = 2;
var r_pick = 3;

// cards are referenced by simple numerical index
var blacks = require('./public/blacks.json');
var whites = require('./public/whites.json');
var whites_draw;

// because players can leave during the game, they are referenced by id
var players;

// round logic
var round_state;
var round_judge;
var round_black;
var round_whites;
var round_extra_whites;

// game settings
var draw_amount = 4;
var intermission_time = 0; // in ms

// debug settings
var debug = true;
var state_switch_time = 0; // in ms
var test_switch_time = 50; // in ms

/******************************************************************************/
function log(text) {
  console.log(text);
}

/*******************************************************************************
* called upon server start
* PRIVATE
*/
function init() {
  round_state = -1;
  if (debug) {
    log('STATE: INIT (setting up server)');
  }
  whites_draw = [];
  players = {};
  start_lobby();
}

/*******************************************************************************
* sets round state to lobby
* PRIVATE
* BROADCASTS
*/
function start_lobby() {
  round_state = s_lobby;
  if (debug) {
    log('STATE: LOBBY (waiting for players)');
  }
}

/*******************************************************************************
* shuffles available white cards
* PRIVATE
*/
function shuffle_whites() {
  if (debug) {
    log('  new game or cards run out; shuffling whites');
  }
  whites_draw = _.shuffle(_.range(whites.length));
}

/*******************************************************************************
* registers a client with the game
* PUBLIC
* BROADCASTS
*/
function add_player(ip, name) {
  id = ip + '_' + name;
  if (debug) {
    log('  player ' + id + ' joined');
  }
  players[id] = {ip: ip, name: name, score: 0, whites: []};
  if (_.size(players) == 3) {
    if (debug) {
      log('  enough players have joined, starting');
    }
    start_round();
  }
}

/*******************************************************************************
* removes a client from the game
* PUBLIC
* BROADCASTS
*/
function remove_player(id) {
  if (debug) {
    log('  player ' + id + ' removed');
  }
  delete players[id];
  if (_.size(players) == 2) {
    if (debug) {
      log('not enough players, returning to lobby');
    }
    goto_lobby();
  }
}

/*******************************************************************************
* determines the player next in order after a given one
* PRIVATE
*/
function get_next_player(id) {
  if (debug) {
    log('    determining player after ' + id);
  }
  var next = false;
  for (p in players) {
    if (next == true) {
      return p;
    }
    else if (p == id) {
      next = true;
    }
  }
  // if no match was found or null was passed, the first player is next
  for (p in players) {
    return p;
  }
}

/*******************************************************************************
* begins a round
* PRIVATE
* BROADCASTS
*/
function start_round() {
  round_state = s_playing;

  // pick random question and set up extra draws
  round_black = Math.floor((Math.random() * blacks.length));
  round_extra_whites = blacks[round_black][1];

  if (debug) {
    log('STATE: PLAYING (a new round has started; dealing cards)');
    log('  black is ' + round_black + ': "' + blacks[round_black][0] + '"');
    if (round_extra_whites > 0) {
      log('  players must play ' + round_extra_whites + ' extra white(s)');
    }
  }

  // decide who is judging
  round_judge = get_next_player(round_judge);
  log('  ' + round_judge + ' is judging, does not get any supranormal whites');

  // draw enough cards for round
  round_whites = {};
  for (p in players) {
    var missing = draw_amount - players[p]['whites'].length;
    for (var i = 0; i < missing; i++) {
      draw_white(p);
    }
    // give any extra cards to non-judge players
    if (p != round_judge) {
      for (var i = 0; i < round_extra_whites; i++) {
        draw_white(p);
      }
    }
  }
}

/*******************************************************************************
* gives a user an additional white card
* PRIVATE
* BROADCASTS
*/
function draw_white(p_id) {
  if (whites_draw.length == 0) {
    shuffle_whites();
  }
  white = whites_draw.pop();
  if (debug) {
    log('    player ' + p_id + ' receives card ' + white);
  }
  players[p_id]['whites'].push(white);
}

/*******************************************************************************
* plays a white card for a given user
* PUBLIC
* BROADCASTS
*/
function play_whites(p_id, whites) {
  if (round_state != s_playing) {
    log('WARNING: round not in play; cannot play cards now');
    return false;
  } else if (p_id == round_judge) {
    log('WARNING: the round judge cannot play white cards');
    return false;
  } else if (whites.length != 1 + round_extra_whites) {
    log('WARNING: user must play ' + (1 + round_extra_whites) + ' whites');
    return false;
  }
  round_whites[p_id] = whites;
  // remove cards from player's hand
  for (w in whites) {
    players[p_id]['whites'] = _.without(players[p_id]['whites'], whites[w]);
  }
  if (debug) {
    log('  player ' + p_id + ' played cards [' + whites + ']');
  }
  // if everyone's played, move to judging
  if (_.size(round_whites) == _.size(players) - 1) {
    setTimeout(start_judging, state_switch_time);
  }
  return true;
}

/*******************************************************************************
* begins judging
* PRIVATE
* BROADCASTS
*/
function start_judging() {
  round_state = s_judging;
  if (debug) {
    log('STATE: JUDGING (all users have played, judging begins)');
  }
}

/*******************************************************************************
* picks the winner of a round
* PUBLIC
* BROADCASTS
*/
function pick_winner(p_id, winner) {
  if (round_state != s_judging) {
    log('WARNING: not everyone has played; cannot judge now');
    return false;
  } else if (p_id != round_judge) {
    log('WARNING: only the judge can pick the winner');
    return false;
  } else if (winner == round_judge) {
    log('WARNING: the judge cannot pick themself as winner');
    return false;
  } else if (!(winner in players)) {
    log('WARNING: winner ' + winner + ' not in game');
    return false;
  }
  players[winner]['score']++;
  if (debug) {
    log_msg = '  player ' + winner + ' was picked as winner, they have ';
    log_msg += players[winner]['score'] + ' points';
    log(log_msg);
  }
  setTimeout(start_intermission, state_switch_time);
  return true;
}

/*******************************************************************************
* sets round state to intermission (judged), sets timer for next round
* PRIVATE
* BROADCASTS
*/
function start_intermission() {
  round_state = s_intermission;
  if (debug) {
    log('STATE: INTERMISSION (judged; waiting for next round)');
  }
  setTimeout(start_round, intermission_time);
}

/*******************************************************************************
* handles messages from clients
* PUBLIC
*/
function handle_request(p_id, payload) {
  // TODO: add in request handling here
}

/*******************************************************************************
* server init
*/
init();

/*******************************************************************************
* testing code goes here
*/

test_1a();

function test_1a() {
  add_player('a', '1');
  add_player('b', '2');
  add_player('c', '3');
  setTimeout(test_1b, test_switch_time)
}

function test_1b() {
  play_whites('b_2', [players['b_2']['whites'][1]]);
  play_whites('c_3', [players['c_3']['whites'][2]]);
  setTimeout(test_1c, test_switch_time)
}

function test_1c() {
  pick_winner('a_1', 'b_2');
  setTimeout(test_2a, test_switch_time)
}

function test_2a() {
  play_whites('a_1', [players['a_1']['whites'][0]]);
  play_whites('c_3', [players['b_2']['whites'][0]]);
  setTimeout(test_2b, test_switch_time)
}

function test_2b() {
  pick_winner('b_2', 'c_3');
  setTimeout(test_3a, test_switch_time)
}

function test_3a() {
  play_whites('b_2', [players['b_2']['whites'][1]]);
  play_whites('a_1', [players['a_1']['whites'][0]]);
  setTimeout(test_3b, test_switch_time)
}

function test_3b() {
  pick_winner('c_3', 'b_2');
  setTimeout(test_3c, test_switch_time)
}

function test_3c() {
  log('INFO: test complete')
}