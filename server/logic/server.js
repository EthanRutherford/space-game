const {performance} = require("perf_hooks");
const WebSocket = require("ws");
const {Sync, Timing, Action, ActionAck, bytify, parse} = require("../../shared/serial");
const Game = require("./game");

const handleError = (error) => error && console.error(error);

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

			// reset and schedule another synchronization pass in 2 minutes
			acc /= count;
			count = 1;
			setTimeout(ping, 2 * 60 * 1000);
		} else {
			ping();
		}
	});

	setTimeout(ping, 20);
}

module.exports = function createServer(server = null) {
	const game = new Game();
	const wss = new WebSocket.Server({server, port: 12345});

	wss.on("connection", (ws) => {
		// set binary type for using Serial
		ws.binaryType = "arraybuffer";

		// start clock synchronization loop
		synchronize(ws, game.frameZero);

		// listen for messages
		ws.on("message", (bytes) => {
			const message = parse(bytes);
			if (message.type === Action) {
				if (game.tryAddAction(message.data)) {
					ws.send(bytify(ActionAck, message.data), handleError);
				}
			}
		});
	});

	game.postSolve = (frameId) => {
		const message = bytify(Sync, frameId, [...game.getBodies()]);

		for (const ws of wss.clients) {
			ws.send(message, handleError);
		}
	};
};
