global.__base = __dirname + '/';
global._ = require(__base + '/lib/underscore');

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var DeckManager = require(__base + '/lib/DeckManager');

// game settings
var servee_port = 8080;
var draw_amount = 4;
var intermission_time = 1000; // in ms

/*******************************************************************************
* various internals
*/
// debug settings
var debug = true;
var state_switch_time = 100; // in ms
var test_switch_time = 50; // in ms

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

// cards are referenced by simple numerical index
blacks_default = require(__base + '/public/blacks.json');
whites_default = require(__base + '/public/whites.json');
var Deck;

// because players can leave during the game, they are referenced by id
var waiting;
var players;
var socket_lookup;

// round logic
var round_state;
var round_judge;
var round_black;
var round_whites;
var round_extra_whites;
var round_players; // number of users that will play white cards

function log(text) {
  console.log(text);
}

/*******************************************************************************
* called upon server start
* PRIVATE
*/
function init() {
  server.listen(servee_port);
  round_state = -1;
  log('STATE: INIT (setting up server)');
  Deck = new DeckManager.DeckManager(blacks_default, whites_default);
  players = {};
  socket_lookup = {};
  start_lobby();
}

/*******************************************************************************
* handling of file requests
* PUBLIC
*/
app.get('/', function (req, res) {
  res.sendFile(__base + '/public/index.html');
});

app.get('/style.css', function (req, res) {
  res.sendFile(__base + '/public/style.css');
});

app.get('/socket.io.js', function (req, res) {
  res.sendFile(__base + '/public/socket.io.js');
});

app.get('/client.js', function (req, res) {
  res.sendFile(__base + '/public/client.js');
});

app.get('/blacks.json', function (req, res) {
  res.sendFile(__base + '/public/blacks.json');
});

app.get('/whites.json', function (req, res) {
  res.sendFile(__base + '/public/whites.json');
});

app.use(function(req, res){
  res.status(404).send('get out');
});

/*******************************************************************************
* handling of client connections and requests
* PUBLIC
*/

io.on('connection', function (socket) {
  log('INFO: ' + socket.handshake.address.address + ' connected');
  socket.join('login');
  socket.emit('msg', 'please connect with your name');
  socket.on('req', function (data) {
    switch (data[0]) {
      case e_join: add_player(socket, data[1]); break;
      case e_quit: remove_player(socket); break;
      case e_play: play_whites(socket_lookup[socket.id], data[1]); break;
      case e_pick: pick_winner(socket_lookup[socket.id], data[1]); break;
    }
  });
});

/*******************************************************************************
* sets round state to lobby
* PRIVATE
* BROADCASTS
*/
function start_lobby() {
  round_state = s_lobby;
  io.to('game').emit('state', [round_state]);
  if (debug) {
    log('STATE: LOBBY (waiting for players)');
  }
}

/*******************************************************************************
* registers a client with the game
* PUBLIC
* BROADCASTS
*/
function add_player(socket, name) {
  var ip = socket.handshake.address.address;
  if (debug) {
    log('  ' + ip + ' joined as ' + name);
  }

  // send current client list to joining player
  for (p in players) {
    socket.emit('event', [e_join, p]);
  }

  // add player to list
  players[name] = {ip: ip, name: name, score: 0, whites: [], waiting: true,
    socket: socket.id};
  socket_lookup[socket.id] = name;
  io.to('game').emit('event', [e_join, name]);

  // add user to the game room
  socket.leave('login');
  socket.join('game');
  socket.emit('msg', 'you have joined the game, ' + name);

  // start the game if this makes enough players
  if (_.size(players) == 3) {
    if (debug) {
      log('  enough players have joined, starting');
    }
    setTimeout(start_round, state_switch_time);
  }
  return true;
}

/*******************************************************************************
* removes a client from the game
* PUBLIC
* BROADCASTS
*/
function remove_player(socket) {
  var id = socket_lookup[socket.id];
  if (debug) {
    log('  player ' + id + ' removed');
  }
  var waiting = players[id]['waiting']
  delete players[id];
  delete socket_lookup[socket.id];
  io.to('game').emit('event', [e_quit, id]);
  
  // not enough players for the round
  if (round_players == 2 && !waiting) {
    // enough players for a new one
    if (_.size(players) > 2) {
      if (debug) {
        log('  not enough players, starting a new round');
      }
      setTimeout(start_round, state_switch_time);
    }
    // not enough; go to lobby
    else {
      if (debug) {
        log('  not enough players, returning to lobby');
      }
      setTimeout(start_lobby, state_switch_time);
    }
  }
  // handle some cases if a round is going
  else if (round_state == s_playing) {
    // the judge quit, start a new round
    if (round_judge == id) {
      setTimeout(start_round, state_switch_time);
      if (debug) {
        log('  the judge quit, starting a new round');
      }
    }
    // remove the user's cards from play otherwise
    else {
      delete round_whites[id];
      round_players--;
    }
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
  round_players = _.size(players) - 1;

  // pick random question and set up extra draws
  round_black = Deck.getBlackCard();
  round_extra_whites = round_black[1];

  if (debug) {
    log('STATE: PLAYING (a new round has started; dealing cards)');
    log('  black is ' + round_black[0]);
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
    players[p]['waiting'] = false; // set all new joiners active
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
  io.to('game').emit('state', [round_state, round_black[0]]);
  io.to('game').emit('event', [e_judg, round_judge]);
}

/*******************************************************************************
* gives a user an additional white card
* PRIVATE
* BROADCASTS
*/
function draw_white(p_id) {
  var white = Deck.getWhiteCard();
  if (debug) {
    log('    player ' + p_id + ' receives card ' + white);
  }
  players[p_id]['whites'].push(white);
  io.to(players[p_id]['socket']).emit('event', [e_draw, white]);
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
  // ensure the player has these cards
  if (_.difference(whites, players[p_id]['whites']).length != 0) {
    log('WARNING: user does not have those cards');
    return false;
  }
  // TODO: need to prevent a user from playing the same card multiple times
  
  round_whites[p_id] = whites;
  // remove cards from player's hand
  for (w in whites) {
    players[p_id]['whites'] = _.without(players[p_id]['whites'], whites[w]);
  }
  if (debug) {
    log('  player ' + p_id + ' played cards [' + whites + ']');
  }
  // if everyone's played, move to judging
  if (_.size(round_whites) == round_players) {
    setTimeout(start_judging, state_switch_time);
  }
  io.to('game').emit('event', [e_play, p_id]);
  return true;
}

/*******************************************************************************
* begins judging
* PRIVATE
* BROADCASTS
*/
function start_judging() {
  round_state = s_judging;
  io.to('game').emit('state', [round_state]);
  // reveal cards to everyone
  for (p_id in round_whites) {
    io.to('game').emit('event', [e_show, p_id, round_whites[p_id]]);
  }
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
  io.to('game').emit('event', [e_pick, winner]);
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
  io.to('game').emit('state', [round_state]);
  if (debug) {
    log('STATE: INTERMISSION (judged; waiting for next round)');
  }
  setTimeout(start_round, intermission_time);
}

/*******************************************************************************
* server init
*/
init();

/*******************************************************************************
* testing code goes here
*/

//test_1a();

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