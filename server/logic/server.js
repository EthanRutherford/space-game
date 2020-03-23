import {performance} from "perf_hooks";
import WebSocket from "ws";
import {roleIds} from "Shared/game/roles";
import {Config, Sync, Timing, Action, bytify, parse} from "Shared/serial";
import {Game} from "./game";

// eslint-disable-next-line no-console
const handleError = (error) => error && console.error(error);

function broadCast(wss, type, ...args) {
	const message = bytify(type, ...args);

	for (const ws of wss.clients) {
		ws.send(message, handleError);
	}
}

function synchronize(ws, frameZero) {
	// calculate round trip time for this connection
	let count = -1;
	let acc = 0;
	let pingTime = null;
	function ping() {
		if (ws.readyState !== WebSocket.OPEN) {
			return;
		}

		pingTime = performance.now();
		ws.ping(handleError);
	}

	ws.on("pong", function() {
		count++;

		// ignore the first pong result, it is always
		// really high for some reason
		if (count === 0) {
			ping();
			return;
		}

		const rtt = performance.now() - pingTime;
		acc += rtt;

		if (count % 5 === 0) {
			// tell client what the current game time is
			const gameTime = performance.now() - frameZero;
			const transitTime = acc / count / 2;
			ws.send(bytify(Timing, gameTime + transitTime), handleError);

			// reset and schedule another synchronization pass in 30 seconds
			acc /= count;
			count = 1;
			setTimeout(ping, 30 * 1000);
		} else {
			ping();
		}
	});

	setTimeout(ping, 100);
}

function initGameClient(game, ws) {
	// start clock synchronization loop
	synchronize(ws, game.frameZero);

	// add handler for game messages
	ws.handleGameMessage = function(message) {
		if (message.type === Action) {
			game.addAction(message.data, ws.id);
		}
	};
}

function initGame(wss) {
	const game = new Game();

	for (const ws of wss.clients) {
		initGameClient(game, ws);
	}

	game.postSolve = (frameId) => {
		broadCast(wss, Sync, frameId, game.getState());
	};

	return game;
}

export function createServer(server = null) {
	let game = null;
	const idStack = new Array(256).fill(0).map((_, i) => i).reverse();
	const wss = new WebSocket.Server({server, port: 12345});

	wss.on("connection", (ws) => {
		// we can only allow so many clients
		if (idStack.length === 0) {
			ws.close();
		}

		// assign a free id
		ws.userId = idStack.pop();
		ws.name = "";
		ws.role = 0;

		// set binary type for using Serial
		ws.binaryType = "arraybuffer";

		// listen for messages
		ws.on("message", (bytes) => {
			const message = parse(bytes);
			if (message.type === Config) {
				if (message.data.type === Config.start) {
					if (game === null) {
						game = initGame(wss);
					} else {
						initGameClient(game, ws);
					}
				} else if (message.data.type === Config.name) {
					ws.name = message.data.name;
					broadCast(wss, Config, message.data);
				} else if (message.data.type === Config.role) {
					// only one player per (meaningful) role
					if (message.data.role !== roleIds.observer) {
						for (const client of wss.clients) {
							if (client.role === message.data.role) {
								return;
							}
						}
					}

					ws.role = message.data.role;
					broadCast(wss, Config, message.data);
				}
			}

			if (ws.handleGameMessage != null) {
				ws.handleGameMessage(message);
			}
		});

		// clean up on close
		ws.on("close", () => {
			// return the id to the stack
			idStack.push(ws.userId);

			// let other users know about the dced user
			broadCast(wss, Config, {
				type: Config.userDced,
				userId: ws.userId,
			});
		});

		// let other users know about this user
		const newClientMessage = bytify(Config, {
			type: Config.newUser,
			user: ws,
		});

		const users = [];
		for (const client of wss.clients) {
			if (client !== ws) {
				users.push(client);
				client.send(newClientMessage, handleError);
			}
		}

		// let the user know their id, and the current user list
		ws.send(bytify(Config, {
			type: Config.init,
			userId: ws.userId,
			users,
		}), handleError);
	});

	wss.on("close", () => {
		if (game != null) {
			game.end();
			game = null;
		}
	});

	return wss;
}
