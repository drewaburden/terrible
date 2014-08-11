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
	for(int i = 0; i < x; i++) {
		cards.push(this.getWhiteCard());
	}
	return cards;
}

//pops one white card from the array and returns it
DeckManager.prototype.getWhiteCard = function() {
	return this.whites_draw.pop();
}

//pops one black card from the array and returns it
DeckManager.prototype.getBlackCard = function() {
	return this.blacks_draw.pop();
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

//creates a shuffled array of all white cards
DeckManager.prototype.createWhitesDraw = function() {
	//copy all white cards into new array
	var newWhites = this.whites.slice();

	//shuffle array
	return shuffleArray(newWhites);
}

//creates a shuffled array of all black cards
DeckManager.prototype.createBlacksDraw = function() {
	//copy all black cards into new array
	var newBlacks = this.blacks.slice();

	//shuffle array
	return shuffleArray(newBlacks);
}

//Taken from http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
// private function
function shuffleArray(array) {
	if(array instanceof Array) {
		var newArray = array.slice(0);
		var counter = array.length, temp, index;

	    // While there are elements in the array
	    while (counter > 0) {
	        // Pick a random index
	        index = Math.floor(Math.random() * counter);

	        // Decrease counter by 1
	        counter--;

	        // And swap the last element with it
	        temp = newArray[counter];
	        newArray[counter] = newArray[index];
	        newArray[index] = temp;
	    }

	    return newArray;
	} else {
		throw new Error("Expected Array, but got different object.");
	}
}