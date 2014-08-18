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
var state_switch_time = 0; // in ms
var test_switch_time = 50; // in ms

// cards are referenced by simple numerical index
var deck_id = "example";
var DeckMgr;

// because players can leave during the game, they are referenced by id
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
  deck_id = process.argv[2];
  server.listen(server_port);
  log('STATE: INIT (setting up server)');
  DeckMgr = new DeckManager(deck_id);
  RoundMgr = new RoundManager();
  players = {};
  socket_lookup = {};
  handleLobby();
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
  log('INFO: ' + socket.request.connection.remoteAddress + ' connected');
  socket.emit('event', [EVENTS.SEND_DECK, DeckMgr.getAllCards()]);
  socket.join('login');
  socket.on('req', function (data) {
    switch (data[0]) {
      case EVENTS.JOIN: addPlayer(socket, data[1]); break;
      case EVENTS.QUIT: removePlayer(socket); break;
      case EVENTS.PLAY_CARDS: playResponses(socket_lookup[socket.id], data[1]);
        break;
      case EVENTS.PICK_WINNER: pickWinner(socket_lookup[socket.id], data[1]);
        break;
    }
  });
  socket.on('disconnect', function () {
    removePlayer(socket);
  });
});

/*******************************************************************************
* sets round state to lobby
* PRIVATE
* BROADCASTS
*/
function handleLobby() {
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
function addPlayer(socket, name) {
  // ensure the client's username meets guidelines, replace with underscores
  var name = name.replace(/[\W]+/g,'_');
  socket.emit('event', [EVENTS.NAME, name]);

  // TODO: allow rejoining
  // for now, don't allow any "duplicate" names
  if (name in players) {
    socket.emit('event', [EVENTS.NAME_CONFLICT]);
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
  players[name] = new Player(ip, name, 0, [], socket.id);
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
    setTimeout(startRound, state_switch_time);
  } else if (_.size(players) > 3) {
    //If the player is joining an IN PROGRESS game, then send them the updated game state
    socket.emit('event', [EVENTS.UPDATE_STATE, [get_game_state()]])
  }
  return true;
}

/*******************************************************************************
* handles an updated RoundManager state
*/
function handleNewRoundState() {
  switch (RoundMgr.getState()) {
    case STATES.LOBBY: setTimeout(handleLobby, state_switch_time); break;
    case STATES.PLAYING_RESET: setTimeout(startRound, state_switch_time); break;
    case STATES.JUDGING: setTimeout(handleJudging, state_switch_time); break;
    default: break;
  }
}

/*******************************************************************************
* removes a client from the game
* PUBLIC
* BROADCASTS
*/
function removePlayer(socket) {
  var id = socket_lookup[socket.id];
  // if they haven't joined the game yet, don't do anything
  if (id == undefined) {
    return;
  }
  if (debug) {
    log('  player ' + id + ' removed');
  }
  delete players[id];
  delete socket_lookup[socket.id];
  io.to('game').emit('event', [EVENTS.QUIT, id]);
  if (RoundMgr.removePlayer(id) == true) {
    handleNewRoundState();
  }
}

/*******************************************************************************
* creates a gamestate and returns it
* PRIVATE
*/
function get_game_state() {
  // TODO: this is causing a server crash
  /*var curr_state = RoundMgr.getState();
  var curr_responses;
  if (curr_state == STATES.JUDGING) {
    //if we are in judging mode, we should get the card ids
    curr_responses = RoundMgr.getResponses();
  } else {
    curr_responses = RoundMgr.getResponded();
  }
  return new Gamestate(curr_state, RoundMgr.getJudge(), get_client_list(), curr_responses);*/
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
function startRound() {
  // if failed for some reason (e.g. player 3 left during intermission)
  // then nothing is done
  if (!RoundMgr.newRound(_.pluck(players, 'name'), DeckMgr.getPromptCard())) {
    return;
  }

  log('STATE: PLAYING (new round started with prompt ' 
    + RoundMgr.getPromptId() + ' [' + RoundMgr.getPromptExtra() + ' extra])');
  log('  ' + RoundMgr.getJudge() + ' is judging, does not get any supranormal responses');

  // draw enough cards for round
  for (p in players) {
    if (RoundMgr.getJudge() != p) {
      drawResponses(p, draw_amount + RoundMgr.getPromptExtra() - players[p]['responses'].length);
    }
  }
  io.to('game').emit('state', [RoundMgr.getState(), RoundMgr.getPromptId()]);
  io.to('game').emit('event', [EVENTS.ANNOUNCE_JUDGE, RoundMgr.getJudge()]);
}

/*******************************************************************************
* gives a user response cards and syncs their hand
* PRIVATE
* BROADCASTS
*/
function drawResponses(p_id, count) {
  for (var i = 0; i < count; i++) {
    var response = DeckMgr.getResponseCard();
    players[p_id]['responses'].push(response);
  }
  io.to(players[p_id]['socket']).emit('event', [EVENTS.SYNC_HAND, players[p_id]['responses']]);
}

/*******************************************************************************
* plays response cards for a given user
* PUBLIC
* BROADCASTS
*/
function playResponses(p_id, responses) {
  if (RoundMgr.getState() != STATES.PLAYING) {
    log('WARNING: round not in play; cannot play cards now');
    return false;
  } else if (p_id == RoundMgr.getJudge()) {
    log('WARNING: the round judge cannot play response cards');
    return false;
  } else if (responses.length != 1 + RoundMgr.getPromptExtra()) {
    log('WARNING: user must play ' + (1 + RoundMgr.getPromptExtra()) + ' responses');
    return false;
  }
  // ensure the player has these cards
  if (_.difference(responses, players[p_id]['responses']).length != 0) {
    log('WARNING: user does not have those cards');
    return false;
  }
  // TODO: need to prevent a user from playing the same card multiple times
  
  if (debug) {
    log('  player ' + p_id + ' playing cards [' + responses + ']');
  }
  // play their cards and move to judging if this is the last player
  if (RoundMgr.playResponsesById(p_id, responses)) {
    handleNewRoundState();
  }
  // remove cards from player's hand
  for (w in responses) {
    players[p_id]['responses'] = _.without(players[p_id]['responses'], responses[w]);
  }
  
  io.to('game').emit('event', [EVENTS.PLAY_CARDS, p_id]);
  return true;
}

/*******************************************************************************
* begins judging
* PRIVATE
* BROADCASTS
*/
function handleJudging() {
  io.to('game').emit('state', [RoundMgr.getState()]);
  // reveal cards to everyone
  for (p_id in RoundMgr.getResponses()) {
    io.to('game').emit('event', [EVENTS.SHOW_CARDS, p_id,
      RoundMgr.getResponses()[p_id]]);
  }
  log('STATE: JUDGING (all users have played, judging begins)');
}

/*******************************************************************************
* picks the winner of a round
* PUBLIC
* BROADCASTS
*/
function pickWinner(p_id, winner) {
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
  setTimeout(startIntermission(winner), state_switch_time);
  return true;
}

/*******************************************************************************
* sets round state to intermission (judged), sets timer for next round
* PRIVATE
* BROADCASTS
*/
function startIntermission(winner) {
  RoundMgr.intermission();
  io.to('game').emit('state', [RoundMgr.getState(), winner]);
  if (debug) {
    log('STATE: INTERMISSION (' + winner + ' won; waiting for next round)');
  }
  setTimeout(startRound, intermission_time);
}

/*******************************************************************************
* server init
*/
init();