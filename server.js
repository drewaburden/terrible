global.__base = __dirname + '/';
global._ = require(__base + '/server/underscore');

require(__base + '/shared/constants');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var DeckManager = require(__base + '/server/DeckManager');
var RoundManager = require(__base + '/server/RoundManager');
var Player = require(__base + '/server/Player');

// game settings
var server_port = 8080;
var draw_amount = 10;
var intermission_time = 4000; // in ms

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
  server.listen(server_port);
  log('STATE: INIT (setting up server)');
  Deck = new DeckManager(blacks_default, whites_default);
  RoundMgr = new RoundManager();
  players = {};
  socket_lookup = {};
  start_lobby();
}

/*******************************************************************************
* handling of file requests
* PUBLIC
*/
app.use(express.static(__base + '/client'));
app.use(express.static(__base + '/shared'));
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
  socket.on('disconnect', function () {
    remove_player(socket);
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
  // TODO: allow rejoining
  // for now, don't allow any "duplicate" names
  if (name in players) {
    return
  }

  var ip = socket.handshake.address.address;
  if (debug) {
    log('  ' + ip + ' joined as ' + name);
  }

  // don't rebroadcast that the player is in the game
  // if they're just reconnecting
  if (!(name in players)) {
    io.to('game').emit('event', [EVENTS.JOIN, [name, 0]]);
  }

  // add player to list
  players[name] = new Player(ip, name, 0, [], true, socket.id);
  socket_lookup[socket.id] = name;

  // send full client list to joining player
  for (p in players) {
    socket.emit('event', [EVENTS.JOIN, [p, players[p].score]]);
  }

  // add user to the game room
  socket.leave('login');
  socket.join('game');

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
  // if they haven't joined the game yet, don't do anything
  if (id == undefined) {
    return;
  }
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
  else if (RoundMgr.getState() == STATES.PLAYING
    || RoundMgr.getState() == STATES.JUDGING) {
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
      RoundMgr.setPlayers(RoundMgr.getPlayers() - 1);
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
* creates a gamestate and returns it
* PRIVATE
*/
function get_game_state() {
  var curr_state = RoundMgr.getState();
  var curr_whites;
  if(curr_state == STATES.JUDGING) {
    //if we are in judging mode, we should get the card ids
    curr_whites = RoundMgr.getWhites();
  } else {
    curr_whites = RoundMgr.getPlayed();
  }
  return new Gamestate(curr_state, RoundMgr.getJudge(), get_client_list(), curr_whites);
}

/*******************************************************************************
* return list of client player objects
* PRIVATE
*/
function get_client_list() {
  var clients = [];
  for(p in players) {
    clients.push(p.getClientPlayerObject());
  }
  return clients;
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
  RoundMgr.setBlack(Deck.getBlackCard()); //Should be done in RoundManager
  RoundMgr.setExtraWhites(RoundMgr.getBlack()[1]); //Should be done in RoundManager
  log('STATE: PLAYING (new round started with black ' 
    + RoundMgr.getBlack()[0] + ' [' + RoundMgr.getExtraWhites() + ' extra])');

  // decide who is judging
  RoundMgr.setJudge(get_next_player(RoundMgr.getJudge())); //Should be done in RoundManager
  log('  ' + RoundMgr.getJudge() + ' is judging, does not get any supranormal whites');

  // draw enough cards for round
  RoundMgr.resetWhites(); //Should be done in RoundManager
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
  
  RoundMgr.playWhitesById(p_id, whites);
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
  log('STATE: JUDGING (all users have played, judging begins)');
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
  players[winner]['score']++;
  setTimeout(start_intermission(winner), state_switch_time);
  return true;
}

/*******************************************************************************
* sets round state to intermission (judged), sets timer for next round
* PRIVATE
* BROADCASTS
*/
function start_intermission(winner) {
  RoundMgr.setState(STATES.INTERMISSION);
  io.to('game').emit('state', [RoundMgr.getState(), winner]);
  if (debug) {
    log('STATE: INTERMISSION (' + winner + ' won; waiting for next round)');
  }
  setTimeout(start_round, intermission_time);
}

/*******************************************************************************
* server init
*/
init();