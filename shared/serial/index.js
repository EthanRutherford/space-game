import {Uint8} from "./primitives";
import {Config} from "./config";
import {Sync} from "./sync";
import {Timing} from "./timing";
import {Action} from "./actions";
const KIND_MAP = [Config, Sync, Timing, Action];
KIND_MAP.forEach((kind, index) => kind.ID = index);

// Big ol buffer (approximately 1MB) for messages.
// We preallocate and reuse this buffer to serialize all
// messages to avoid repeatedly allocating and de-allocating
// buffers. Doing so saves on allocation costs and prevents
// clogging up the GC with a constant stream of garbage.
// Lastly, it also means we don't need to compute the size
// of the array buffer ahead of time, so long as we keep
// the message sizes under 1MB (which is desireable anyway).
const byteBuffer = new Uint8Array(2 ** 20);
const bufferView = new DataView(byteBuffer.buffer);

export {Config, Sync, Timing, Action};

export function bytify(type, ...args) {
	const state = {
		dataView: bufferView,
		index: 0,
	};

	// encode which message kind
	Uint8.bytify(state, type.ID);

	// encode data
	type.bytify(state, ...args);

	return byteBuffer.subarray(0, state.index);
}

export function parse(buffer) {
	const state = {
		dataView: new DataView(buffer),
		index: 0,
	};

	// determine type
	const type = KIND_MAP[Uint8.parse(state)];

	// return deserialized message
	return {type, data: type.parse(state)};
}
