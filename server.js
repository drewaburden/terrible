global.__base = __dirname + '/';
global._ = require(__base + '/lib/underscore');

require(__base + '/shared/constants');

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var DeckManager = require(__base + '/lib/DeckManager');
var RoundManager = require(__base + '/lib/RoundManager');
var RoundState = require(__base + '/lib/RoundManager').RoundState;

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

// cards are referenced by simple numerical index
blacks_default = require(__base + '/shared/blacks.json');
whites_default = require(__base + '/shared/whites.json');
var Deck;

// because players can leave during the game, they are referenced by id
var waiting;
var players;
var socket_lookup;

// round logic
var RoundMgr;

function log(text) {
  console.log(text);
}

/*******************************************************************************
* called upon server start
* PRIVATE
*/
function init() {
  server.listen(servee_port);
  log('STATE: INIT (setting up server)');
  Deck = new DeckManager.DeckManager(blacks_default, whites_default);
  RoundMgr = new RoundManager.RoundManager();
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

app.get('/constants.js', function (req, res) {
  res.sendFile(__base + '/shared/constants.js');
});

app.get('/client.js', function (req, res) {
  res.sendFile(__base + '/public/client.js');
});

app.get('/blacks.json', function (req, res) {
  res.sendFile(__base + '/shared/blacks.json');
});

app.get('/whites.json', function (req, res) {
  res.sendFile(__base + '/shared/whites.json');
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
      case EVENTS.JOIN: add_player(socket, data[1]); break;
      case EVENTS.QUIT: remove_player(socket); break;
      case EVENTS.PLAY_CARDS: play_whites(socket_lookup[socket.id], data[1]);
        break;
      case EVENTS.PICK_WINNER: pick_winner(socket_lookup[socket.id], data[1]);
        break;
    }
  });
});

/*******************************************************************************
* sets round state to lobby
* PRIVATE
* BROADCASTS
*/
function start_lobby() {
  RoundMgr.setState(STATES.LOBBY);
  io.to('game').emit('state', [RoundMgr.getState()]);
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
    socket.emit('event', [EVENTS.JOIN, p]);
  }

  // add player to list
  players[name] = {ip: ip, name: name, score: 0, whites: [], waiting: true,
    socket: socket.id};
  socket_lookup[socket.id] = name;
  io.to('game').emit('event', [EVENTS.JOIN, name]);

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
  io.to('game').emit('event', [EVENTS.QUIT, id]);
  
  // not enough players for the round
  if (RoundMgr.getPlayers() == 2 && !waiting) {
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
  else if (RoundMgr.getState() == STATES.PLAYING) {
    // the judge quit, start a new round
    if (RoundMgr.getJudge() == id) {
      setTimeout(start_round, state_switch_time);
      if (debug) {
        log('  the judge quit, starting a new round');
      }
    }
    // remove the user's cards from play otherwise
    else {
      RoundMgr.deleteWhitesById(id);
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
  RoundMgr.setState(STATES.PLAYING);
  RoundMgr.setPlayers(_.size(players) - 1);

  // pick random question and set up extra draws
  RoundMgr.setBlack(Deck.getBlackCard());
  RoundMgr.setExtraWhites(RoundMgr.getBlack()[1]);

  if (debug) {
    log('STATE: PLAYING (a new round has started; dealing cards)');
    log('  black is ' + RoundMgr.getBlack()[0]);
    if (RoundMgr.getExtraWhites() > 0) {
      log('  players must play ' + RoundMgr.getExtraWhites() + ' extra white(s)');
    }
  }

  // decide who is judging
  RoundMgr.setJudge(get_next_player(RoundMgr.getJudge()));
  log('  ' + RoundMgr.getJudge() + ' is judging, does not get any supranormal whites');

  // draw enough cards for round
  RoundMgr.resetWhites();
  for (p in players) {
    players[p]['waiting'] = false; // set all new joiners active
    var missing = draw_amount - players[p]['whites'].length;
    for (var i = 0; i < missing; i++) {
      draw_white(p);
    }
    // give any extra cards to non-judge players
    if (p != RoundMgr.getJudge()) {
      for (var i = 0; i < RoundMgr.getExtraWhites(); i++) {
        draw_white(p);
      }
    }
  }
  io.to('game').emit('state', [RoundMgr.getState(), RoundMgr.getBlack()[0]]);
  io.to('game').emit('event', [EVENTS.ANNOUNCE_JUDGE, RoundMgr.getJudge()]);
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
  io.to(players[p_id]['socket']).emit('event', [EVENTS.DRAW_CARD, white]);
}

/*******************************************************************************
* plays a white card for a given user
* PUBLIC
* BROADCASTS
*/
function play_whites(p_id, whites) {
  if (RoundMgr.getState() != STATES.PLAYING) {
    log('WARNING: round not in play; cannot play cards now');
    return false;
  } else if (p_id == RoundMgr.getJudge()) {
    log('WARNING: the round judge cannot play white cards');
    return false;
  } else if (whites.length != 1 + RoundMgr.getExtraWhites()) {
    log('WARNING: user must play ' + (1 + RoundMgr.getExtraWhites()) + ' whites');
    return false;
  }
  // ensure the player has these cards
  if (_.difference(whites, players[p_id]['whites']).length != 0) {
    log('WARNING: user does not have those cards');
    return false;
  }
  // TODO: need to prevent a user from playing the same card multiple times
  
  RoundMgr.getWhites()[p_id] = whites;
  // remove cards from player's hand
  for (w in whites) {
    players[p_id]['whites'] = _.without(players[p_id]['whites'], whites[w]);
  }
  if (debug) {
    log('  player ' + p_id + ' played cards [' + whites + ']');
  }
  // if everyone's played, move to judging
  if (_.size(RoundMgr.getWhites()) == RoundMgr.getPlayers()) {
    setTimeout(start_judging, state_switch_time);
  }
  io.to('game').emit('event', [EVENTS.PLAY_CARDS, p_id]);
  return true;
}

/*******************************************************************************
* begins judging
* PRIVATE
* BROADCASTS
*/
function start_judging() {
  RoundMgr.setState(STATES.JUDGING);
  io.to('game').emit('state', [RoundMgr.getState()]);
  // reveal cards to everyone
  for (p_id in RoundMgr.getWhites()) {
    io.to('game').emit('event', [EVENTS.SHOW_CARDS, p_id,
      RoundMgr.getWhites()[p_id]]);
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
  if (RoundMgr.getState() != STATES.JUDGING) {
    log('WARNING: not everyone has played; cannot judge now');
    return false;
  } else if (p_id != RoundMgr.getJudge()) {
    log('WARNING: only the judge can pick the winner');
    return false;
  } else if (winner == RoundMgr.getJudge()) {
    log('WARNING: the judge cannot pick themself as winner');
    return false;
  } else if (!(winner in players)) {
    log('WARNING: winner ' + winner + ' not in game');
    return false;
  }
  io.to('game').emit('event', [EVENTS.PICK_WINNER, winner]);
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
  RoundMgr.setState(STATES.INTERMISSION);
  io.to('game').emit('state', [RoundMgr.getState()]);
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