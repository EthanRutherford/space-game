const {Action, bytify, parse} = require("../../shared/serial");

class MessageChannel {
	constructor(url) {
		this.closed = false;
		this.websocket = null;

		const tryConnect = () => {
			this.websocket = new WebSocket(url);
			this.websocket.binaryType = "arraybuffer";
			this.websocket.onmessage = (event) => {
				if (this.onMessage) {
					this.onMessage(parse(event.data));
				}
			};
			this.websocket.onerror = (error) => {
				if (this.onError) {
					this.onError(error);
				}
			};
			this.websocket.onclose = () => {
				if (this.closed) return;

				setTimeout(tryConnect, 100);
			};
		};

		tryConnect();
	}
	send(frameId, action) {
		this.websocket.send(bytify(Action, frameId, action));
	}
	close() {
		this.closed = true;
		if (this.websocket) {
			this.websocket.close();
		}
	}
}

module.exports = MessageChannel;
