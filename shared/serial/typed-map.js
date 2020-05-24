import {Uint16} from "./primitives";

export const TypedMap = {
	bytify: (state, keyType, valueType, map) => {
		const entries = Object.entries(map);
		Uint16.bytify(state, entries.length);

		for (const [key, value] of entries) {
			keyType.bytify(state, key);
			valueType.bytify(state, value);
		}
	},
	parse: (state, keyType, valueType) => {
		const count = Uint16.parse(state);
		const map = {};

		for (let i = 0; i < count; i++) {
			map[keyType.parse(state)] = valueType.parse(state);
		}

		return map;
	},
};
