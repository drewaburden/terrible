var fs = require('fs');

exports.DeckLoader = DeckLoader;
function DeckLoader(deck_id) {
	this.promptsFile = 'prompts.json';
	this.responsesFile = 'responses.json';
	this.cardsFolder = __base + '/decks/' + deck_id + '/';
	this.encodingType = 'utf8';
}

DeckLoader.prototype.loadPromptsFromFile = function() {
	return JSON.parse(fs.readFileSync(this.cardsFolder + this.promptsFile, this.encodingType));
};

DeckLoader.prototype.loadResponsesFromFile = function() {
	return JSON.parse(fs.readFileSync(this.cardsFolder + this.responsesFile, this.encodingType));
}

DeckLoader.prototype.writePromptsToFile = function(prompts) {
	fs.writeFile(this.cardsFolder + this.promptsFile, JSON.stringify(prompts, null, 4), this.encodingType, function(err, data) {
		if(err) { 
			return console.log(err); 
		}
		console.log("Finished writing prompts to file with data: " + data);
	});
}

DeckLoader.prototype.writeResponsesToFile = function(responses) {
	fs.writeFile(this.cardsFolder + this.responsesFile, JSON.stringify(responses, null, 4), this.encodingType, function(err, data) {
		if(err) { 
			return console.log(err); 
		}
		console.log("Finished writing responses to file with data: " + data);
	});
}