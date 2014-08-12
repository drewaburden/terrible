module.exports = RoundManager;
function RoundManager() {
	// round logic
	this.round_state = STATES.INIT;
	this.round_judge = -1;
	this.round_black = -1;
	this.round_whites = {};
	this.round_extra_whites = {};
	this.round_players = 0; // number of users that will play white cards
	this.round_played = 0; // number of users who have played this round
}

RoundManager.prototype.getState = function() {
	return this.round_state;
}

RoundManager.prototype.setState = function(state) {
	this.round_state = state;
	if(state = STATES.PLAYING) {
		this.played = 0;
		this.resetWhites();
	}
}

RoundManager.prototype.getJudge = function() {
	return this.round_judge;
}

RoundManager.prototype.setJudge = function(judge) {
	this.round_judge = judge;
}

RoundManager.prototype.getBlack = function() {
	return this.round_black;
}

RoundManager.prototype.setBlack = function(black) {
	this.round_black = black;
}

RoundManager.prototype.getWhites = function() {
	return this.round_whites;
}

RoundManager.prototype.setWhites = function(whites) {
	this.round_whites = whites;
}

RoundManager.prototype.getExtraWhites = function() {
	return this.round_extra_whites;
}

RoundManager.prototype.setExtraWhites = function(extra_whites) {
	this.round_extra_whites = extra_whites;
}

RoundManager.prototype.getPlayers = function() {
	return this.round_players;
}

RoundManager.prototype.setPlayers = function(players) {
	this.round_players = players;
}

RoundManager.prototype.setPlayed = function(played) {
	this.round_played = played;
}

RoundManager.prototype.getPlayed = function () {
	return this.round_played;
}

RoundManager.prototype.newPlayer = function() {
	++this.round_players;
}

RoundManager.prototype.playWhitesById = function(id, whites) {
	++this.round_played;
	this.round_whites[id] = whites;
}

RoundManager.prototype.deleteWhitesById = function(id) {
	delete this.round_whites[id];
}

RoundManager.prototype.resetWhites = function() {
	this.round_whites = {};
}