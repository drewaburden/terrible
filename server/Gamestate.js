module.exports = Gamestate;
function Gamestate(state, judge, players, responses) {
	//This object is just a definition, no actual methods. this should be a generic state we can send a client at any time.
	this.state = state;
	this.judge = judge;
	this.players = players;
	this.responses = responses;
}