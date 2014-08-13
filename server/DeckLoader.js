var fs = require('fs');
exports.DeckLoader = DeckLoader;
function DeckLoader() {
	this.promptsFile = __base + '/shared/prompts.json';
	this.responsesFile = __base + '/shared/responses.json';
	this.encodingType = 'utf8';
}

DeckLoader.prototype.loadPromptsFromFile = function() {
	return JSON.parse(fs.readFileSync(this.promptsFile, this.encodingType));
};

DeckLoader.prototype.loadResponsesFromFile = function() {
	return JSON.parse(fs.readFileSync(this.responsesFile, this.encodingType));
}

DeckLoader.prototype.writePromptsToFile = function(prompts) {
	fs.writeFile(this.prompts, JSON.stringify(prompts, null, 4), this.encodingType, function(err, data) {
		if(err) { 
			return console.log(err); 
		}
		console.log("Finished writing prompts to file with data: " + data);
	});
}

DeckLoader.prototype.writeResponsesToFile = function(responses) {
	fs.writeFile(this.responsesFile, JSON.stringify(responses, null, 4), this.encodingType, function(err, data) {
		if(err) { 
			return console.log(err); 
		}
		console.log("Finished writing responses to file with data: " + data);
	});
}