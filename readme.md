# terrible

A *Cards Against Humanity* clone for a single room of users. Extremely WIP, probably not terribly well coded at the moment.

## Requirements

Runs on Node.js.

`npm install express`

`npm install socket.io`

## Setup

Create a `shared/blacks.json` (these are the prompts, which are black cards in *CAH*) and `shared/whites.json` (these are the responses, likewise white cards) based off the example files. These can be *Cards Against Humanity* or *Apples to Apples* style, or anything else that follows a **prompt : response(s)** format.

Once that's done, run `node server.js` and open `localhost:8080` in your web browser. Three or more players are required for a game.

![](etc/example.png)