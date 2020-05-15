let websocket = null;
function openSocket(offset) {
	websocket = new WebSocket(`ws://${location.hostname}:12345`);
	websocket.binaryType = "arraybuffer";
	websocket.onmessage = ({data}) => {
		postMessage({message: data, timeStamp: performance.now() + offset});
	};
	websocket.onerror = (error) => {
		// eslint-disable-next-line no-console
		console.error(error);
	};
	websocket.onclose = () => {
		setTimeout(() => openSocket(offset), 100);
	};
}

onmessage = function(event) {
	if (event.data.type === "open") {
		const myOffset = performance.now() - Date.now();
		openSocket(event.data.offset - myOffset);
	} else if (event.data.type === "send") {
		websocket.send(event.data.message);
	}
};
