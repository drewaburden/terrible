exports.DeckManager = DeckManager;
function DeckManager(blacks, whites) {
	this.blacks = blacks;
	this.whites = whites;
	this.whites_draw = this.createWhitesDraw();
	this.blacks_draw = this.createBlacksDraw();
}

// Get x number of cards from whites_draw array
DeckManager.prototype.getWhiteCards = function(x) {
	var cards = [];
	for(var i = 0; i < x; i++) {
		cards.push(this.getWhiteCard());
	}
	return cards;
}

//pops one white card from the array and returns it
DeckManager.prototype.getWhiteCard = function() {
	var card = this.whites_draw.pop();
	if(card == undefined) {
		this.reloadWhitesDrawDeck();
		card = this.whites_draw.pop();
	}
	return card;
}

//pops one black card from the array and returns it
DeckManager.prototype.getBlackCard = function() {
	var card = this.blacks_draw.pop();
	if(card == undefined) {
		this.reloadBlacksDrawDeck();
		card = this.blacks_draw.pop();
	}
	var extra = this.blacks[card][1]; // number of extra cards to draw
	return [card, extra];
}

//reloads the whites_draw deck from the base white decks
DeckManager.prototype.reloadWhitesDrawDeck = function() {
	this.whites_draw = this.createBlacksDraw();
}

//reloads the blacs_draw deck from the base black decks
DeckManager.prototype.reloadBlacksDrawDeck = function() {
	this.blacks_draw = this.createBlacksDraw();
}

//sets a new blacks array
DeckManager.prototype.setBlacks = function(blacks) {
	this.blacks = blacks;
}

//sets a new whites array
DeckManager.prototype.setWhites = function(whites) {
	this.whites = whites;
}

//creates a shuffled array of all white card IDs
DeckManager.prototype.createWhitesDraw = function() {
	return _.shuffle(_.range(this.whites.length));
}

//creates a shuffled array of all black card IDs
DeckManager.prototype.createBlacksDraw = function() {
	return _.shuffle(_.range(this.blacks.length));
}