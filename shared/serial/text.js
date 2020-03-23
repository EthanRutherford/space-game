import {Uint16} from "./primitives";

export const Text = {
	bytify: (state, value) => {
		Uint16.bytify(state, value.length);
		for (let i = 0; i < value.length; i++) {
			Uint16.bytify(state, value.charCodeAt(i));
		}
	},
	parse: (state) => {
		const length = Uint16.parse(state);
		let result = "";

		for (let i = 0; i < length; i++) {
			result += String.fromCharCode(Uint16.parse(state));
		}

		return result;
	},
};
