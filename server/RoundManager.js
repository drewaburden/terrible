module.exports = RoundManager;
function RoundManager() {
	// round logic
	this.round_state = STATES.INIT;
	this.round_judge = -1;
	this.round_black_id = -1;
	this.round_black_extra = -1;
	this.round_whites = {};
	this.round_players = []; // all users in the round
	this.round_responders = -1; // users that will play white cards
	this.round_responded = -1; // users that have played white cards
}

RoundManager.prototype.getState = function() {
	return this.round_state;
}

RoundManager.prototype.setState = function(state, data) {
	this.round_state = state;
	if(state == STATES.PLAYING) {
		this.setRoundPlayers(data[0]);
		this.setBlackCard(data[1]);
		this.resetWhites();
	}
}

RoundManager.prototype.getPlayers = function() {
	return this.round_responders;
}

RoundManager.prototype.setRoundPlayers = function(players) {
	this.round_players = players;
	this.determineNextJudge();
	this.round_responders = this.round_players.length - 1;
	this.round_responded = 0;
}

RoundManager.prototype.playWhitesById = function(id, whites) {
	this.round_whites[id] = whites;
	this.round_responded++;
	if (this.round_responded == this.round_responders) {
		this.setState(STATES.JUDGING);
	}
}

RoundManager.prototype.deleteWhitesById = function(id) {
	delete this.round_whites[id];
}

RoundManager.prototype.resetWhites = function() {
	this.round_whites = {};
}

RoundManager.prototype.getJudge = function() {
	return this.round_judge;
}

RoundManager.prototype.setJudge = function(judge) {
	this.round_judge = judge;
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

RoundManager.prototype.getPlayed = function () {
	return this.round_responded;
}

/*******************************************************************************
* determines the player next in order after a given one
* works by incrementing the index and using a modulo to ensure bounds
*/
RoundManager.prototype.determineNextJudge = function() {
	this.round_judge = this.round_players[(_.indexOf(this.round_players,
		this.round_judge) + 1) % this.round_players.length];

	/*var next = false;
	var player;
	for (var i = 0; i < this.round_players.length; i++) {
		if (next == true) {
			this.round_judge = this.round_players[i];
			return;
		}
		else if (this.round_players[i] == this.round_judge) {
			next = true;
		}
	}
	this.round_judge = this.round_players[0];
	return;
	this.round_judge = player;*/
}