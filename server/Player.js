function Player(ip, name, score, whites, waiting, socket) {
	this.ip = ip;
	this.name = name;
	this.score = score;
	this.whites = whites;
	this.waiting = waiting;
	this.socket = socket;
}

Player.prototype.getClientPlayerObject = function() {
	var player = {};
	player['name'] = this.name;
	player['score'] = this.score;
	return player;
}
module.exports = Player;