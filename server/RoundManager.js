module.exports = RoundManager;
function RoundManager() {
	// round logic
	this.round_state = STATES.INIT;
	this.round_players = []; // all users in the round
	this.round_judge = -1;
	this.round_responders = -1; // number of users that will play white cards
	this.round_responded = -1; // number of users that have done so
	this.round_black_id = -1;
	this.round_black_extra = -1;
	this.round_whites = {};
}

RoundManager.prototype.getState = function() {
	return this.round_state;
}

RoundManager.prototype.setState = function(state, data) {
	this.round_state = state;
	if(state == STATES.PLAYING) {
		this.setPlayers(data[0]);
		this.setBlackCard(data[1]);
		this.resetWhites();
	}
}

RoundManager.prototype.setPlayers = function(players) {
	this.round_players = players;
	// determines the next judge in order
	this.round_judge = this.round_players[(_.indexOf(this.round_players,
		this.round_judge) + 1) % this.round_players.length];
	this.round_responders = this.round_players.length - 1;
	this.round_responded = 0;
}

// removes a player from the game
// returns true if the game state was changed
RoundManager.prototype.removePlayer = function(id) {
	this.round_players = _.without(this.round_players, id);
	// the judge left
	if (id == this.round_judge) {
		// return to lobby if not enough players
		if (this.round_players.length < 3) {
			this.setState(STATES.LOBBY);
			return true;
		}
		// otherwise, just start a new round
		else {
			this.setState(STATES.PLAYING_RESET);
			return true;
		}
	}
	// a responder left
	else {
		this.round_responders--;
		// delete their cards if they played
		if (id in this.round_whites) {
			delete this.round_whites[id];
			this.round_responded--;
		}
		// return to lobby if not enough responders
		if (this.round_responders < 2) {
			this.setState(STATES.LOBBY);
			return true;
		}
	}
	return false;
}

RoundManager.prototype.playWhitesById = function(id, whites) {
	this.round_whites[id] = whites;
	this.round_responded++;
	if (this.round_responded == this.round_responders) {
		this.setState(STATES.JUDGING);
	}
}

RoundManager.prototype.resetWhites = function() {
	this.round_whites = {};
}

RoundManager.prototype.getJudge = function() {
	return this.round_judge;
}

RoundManager.prototype.getBlackId = function() {
	return this.round_black_id;
}

RoundManager.prototype.getBlackExtra = function() {
	return this.round_black_extra;
}

RoundManager.prototype.setBlackCard = function(black) {
	this.round_black_id = black[0];
	this.round_black_extra = black[1];
}

RoundManager.prototype.getWhites = function() {
	return this.round_whites;
}


// used by gamestate
RoundManager.prototype.getResponded = function () {
	return this.round_responded;
}