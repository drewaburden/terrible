# terrible

A *Cards Against Humanity* style game for a single room of users. Extremely WIP if not hacky.

![](etc/example.png)

## Requirements

Runs on Node.js.

`npm install express`

`npm install socket.io`

## Setup

Create a `decks/prompts.json` (these are the black cards in *CAH*) and `decks/responses.json` (likewise, the white cards) based off the example files. These can be *CAH* or *Apples to Apples* style, or anything else that follows a **prompt : response(s)** format.

The numbers in the prompts file determine how many extra responses are played to that prompt. So, a "Make a haiku: ____ / ____ / ____" prompt would need 2 extras.

Once that's done, run `node server.js` and open `localhost:8080` in your web browser. Three or more players are required for a game.

## Known Issues

  * lots, probably
  * users newly joining won't receive a full game state until the next round