module.exports = RoundManager;
function RoundManager() {
	// round logic
	this.round_state = STATES.INIT;
	this.round_players = []; // all users in the round
	this.round_judge = -1;
	this.round_responders = -1; // number of users that will play response cards
	this.round_responded = -1; // number of users that have done so
	this.round_prompt_id = -1;
	this.round_prompt_extra = -1;
	this.round_responses = {};
}

RoundManager.prototype.getState = function() {
	return this.round_state;
}

RoundManager.prototype.setState = function(state, data) {
	this.round_state = state;
	if(state == STATES.PLAYING) {
		this.setPlayers(data[0]);
		this.setPromptCard(data[1]);
		this.resetResponses();
	}
}

// starts a new round
// returns true if the game state was changed 
RoundManager.prototype.newRound = function(players, prompt) {
	if (players.length < 3) {
		return false;
	}
	this.round_state = STATES.PLAYING;
	this.setPlayers(players);
	this.setPromptCard(prompt);
	this.resetResponses();
	return true;
}

RoundManager.prototype.intermission = function() {
	this.round_state = STATES.INTERMISSION;
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
		if (id in this.round_responses) {
			delete this.round_responses[id];
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

// plays a user's cards
// returns true if the game state was changed 
RoundManager.prototype.playResponsesById = function(id, responses) {
	this.round_responses[id] = responses;
	this.round_responded++;
	if (this.round_responded == this.round_responders) {
		this.setState(STATES.JUDGING);
		return true;
	}
	return false;
}

RoundManager.prototype.resetResponses = function() {
	this.round_responses = {};
}

RoundManager.prototype.getJudge = function() {
	return this.round_judge;
}

RoundManager.prototype.getPromptId = function() {
	return this.round_prompt_id;
}

RoundManager.prototype.getPromptExtra = function() {
	return this.round_prompt_extra;
}

RoundManager.prototype.setPromptCard = function(prompt) {
	this.round_prompt_id = prompt[0];
	this.round_prompt_extra = prompt[1];
}

RoundManager.prototype.getResponses = function() {
	return this.round_responses;
}


// used by gamestate
RoundManager.prototype.getResponded = function () {
	return this.round_responded;
}