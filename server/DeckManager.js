module.exports = DeckManager;
function DeckManager(prompts, responses) {
	this.prompts = prompts;
	this.responses = responses;
	this.responses_draw = this.createResponsesDraw();
	this.prompts_draw = this.createPromptsDraw();
}

// Get x number of cards from responses_draw array
DeckManager.prototype.getResponseCards = function(x) {
	var cards = [];
	for(var i = 0; i < x; i++) {
		cards.push(this.getResponseCard());
	}
	return cards;
}

//pops one response card from the array and returns it
DeckManager.prototype.getResponseCard = function() {
	var card = this.responses_draw.pop();
	if(card == undefined) {
		this.reloadResponsesDrawDeck();
		card = this.responses_draw.pop();
	}
	return card;
}

//pops one prompt card from the array and returns it
DeckManager.prototype.getPromptCard = function() {
	var card = this.prompts_draw.pop();
	if(card == undefined) {
		this.reloadPromptsDrawDeck();
		card = this.prompts_draw.pop();
	}
	var extra = this.prompts[card][1]; // number of extra cards to draw
	return [card, extra];
}

//reloads the responses_draw deck from the base response decks
DeckManager.prototype.reloadResponsesDrawDeck = function() {
	this.responses_draw = this.createPromptsDraw();
}

//reloads the prompts_draw deck from the base prompt decks
DeckManager.prototype.reloadPromptsDrawDeck = function() {
	this.prompts_draw = this.createPromptsDraw();
}

//sets a new prompts array
DeckManager.prototype.setPrompts = function(prompts) {
	this.prompts = prompts;
}

//sets a new responses array
DeckManager.prototype.setResponses = function(responses) {
	this.responses = responses;
}

//creates a shuffled array of all response card IDs
DeckManager.prototype.createResponsesDraw = function() {
	return _.shuffle(_.range(this.responses.length));
}

//creates a shuffled array of all prompt card IDs
DeckManager.prototype.createPromptsDraw = function() {
	return _.shuffle(_.range(this.prompts.length));
}

//add a new card to the prompts array
DeckManager.prototype.addPrompt = function(content, num_responses) {
	var prompt = [content, num_responses];
	this.prompts.push(prompt);
};

//add a new card to the responses array
DeckManager.prototype.addResponse = function(content) {
	this.responses.push(content);
}