const {Config, Action, bytify, parse} = require("../../shared/serial");

class DataChannel {
	constructor() {
		this.closed = false;
		this.websocket = null;
		this.listeners = new Set();

		const tryConnect = () => {
			this.websocket = new WebSocket(`ws://${location.hostname}:12345`);
			this.websocket.binaryType = "arraybuffer";
			this.websocket.onmessage = (event) => {
				const message = parse(event.data);
				for (const listener of this.listeners) {
					listener(message);
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
	sendAction(action) {
		this.websocket.send(bytify(Action, action));
	}
	sendConfig(config) {
		this.websocket.send(bytify(Config, config));
	}
	close() {
		this.closed = true;
		if (this.websocket) {
			this.websocket.close();
		}
	}
	addListener(listener) {
		this.listeners.add(listener);
	}
	removeListener(listener) {
		this.listeners.delete(listener);
	}
}

module.exports = DataChannel;
