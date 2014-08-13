global.STATES = {
	INIT: -1,
	LOBBY: 0,
	PLAYING: 1,
	JUDGING: 2,
	INTERMISSION: 3,
	PLAYING_RESET: 4
}

global.EVENTS = {
	JOIN: 0,
	QUIT: 1,
	PLAY_CARDS: 3,
	SHOW_CARDS: 4,
	PICK_WINNER: 5,
	ANNOUNCE_JUDGE: 6,
	SYNC_HAND: 7
}