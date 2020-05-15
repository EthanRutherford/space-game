import {Config, Action, bytify, parse} from "Shared/serial";
import SocketWorker from "./socket.worker.js";

const listeners = new Set();
const worker = new SocketWorker();
worker.postMessage({type: "open", offset: performance.now() - Date.now()});
worker.onmessage = ({data}) => {
	const message = parse(data.message);
	for (const listener of listeners) {
		listener(message, data.timeStamp);
	}
};

export const dataChannel = {
	sendAction(action) {
		worker.postMessage({type: "send", message: bytify(Action, action)});
	},
	sendConfig(config) {
		worker.postMessage({type: "send", message: bytify(Config, config)});
	},
	addListener(listener) {
		listeners.add(listener);
	},
	removeListener(listener) {
		listeners.delete(listener);
	},
};
