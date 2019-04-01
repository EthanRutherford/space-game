const {Uint16} = require("./primitives");

const stringEncoder = new TextEncoder("utf-8");
const stringDecoder = new TextDecoder("utf-8");

// bytifying strings is copy-heavy compared to other serial types.
// sending plaintext over the wire like this is therefore not as
// cheap, and should used sparingly in high-frequency messages.
const Text = {
	bytify: (state, value) => {
		Uint16.bytify(state, value.length);
		const encoded = stringEncoder.encode(value);
		state.bytes.set(encoded, state.index);
		state.index += encoded.byteLength;
	},
	parse: (state) => {
		const length = Uint16.parse(state);
		const result = stringDecoder.decode(state.bytes.subarray(
			state.index, state.index + length,
		));
		state.index += length;
		return result;
	},
};

module.exports = Text;
