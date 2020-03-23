import {Uint16} from "./primitives";

export const TypedArray = {
	bytify: (state, type, array) => {
		Uint16.bytify(state, array.length);
		for (const value of array) {
			type.bytify(state, value);
		}
	},
	parse: (state, type) => {
		const array = new Array(Uint16.parse(state));
		for (let i = 0; i < array.length; i++) {
			array[i] = type.parse(state);
		}

		return array;
	},
};
