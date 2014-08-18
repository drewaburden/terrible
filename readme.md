# terrible

A *Cards Against Humanity* style game for a single room of users. The code's still pretty WIP.

![](etc/example.png)

## Requirements

Runs on Node.js.

`npm install express`

`npm install socket.io`

## Setup

Create a `prompts.json` (these are the black cards in *CAH*, or the green ones in *Apples to Apples*) and `responses.json` (likewise, the white and red cards) in a subfolder of /decks based off the /decks/example files. These can be in the style of either of those games, or anything else that follows a **prompt : response(s)** format.

Once that's done, run `node server.js deckname` and open `localhost:8080` in your web browser. Three or more players are required for a game.

### Card JSON Structure

Prompts: **text**, **subtext**, **extra responses**†

Responses: **text**, **subtext**

†How many extra responses are played to that prompt. So, a "Make a haiku: ____ / ____ / ____" prompt would need 2 extras.

## Known Issues

  * connection loss handling is incomplete
  * users newly joining won't receive a full game state until the next round
  * selection of new judge when old one leaves may favor the first player
  * users who played cards when a judge leaves will lose those cards

## Planned Features

  * a way to see round history