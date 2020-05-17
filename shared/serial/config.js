import {Uint8} from "./primitives";
import {TypedArray} from "./typed-array";
import {Text} from "./text";

const User = {
	bytify: (state, user) => {
		Uint8.bytify(state, user.userId);
		Text.bytify(state, user.name || "");
		Uint8.bytify(state, user.role || 0);
	},
	parse: (state) => {
		return {
			userId: Uint8.parse(state),
			name: Text.parse(state),
			role: Uint8.parse(state),
		};
	},
};

const CONFIG_MAP = [];
function makeConfig(serial) {
	CONFIG_MAP.push(serial);
	return CONFIG_MAP.length - 1;
}

export const Config = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.type);
		CONFIG_MAP[config.type].bytify(state, config);
	},
	parse: (state) => {
		const config = {type: Uint8.parse(state)};
		CONFIG_MAP[config.type].parse(state, config);
		return config;
	},
	init: makeConfig({
		bytify: (state, config) => {
			Uint8.bytify(state, config.userId);
			TypedArray.bytify(state, User, config.users);
		},
		parse: (state, config) => {
			config.userId = Uint8.parse(state);
			config.users = TypedArray.parse(state, User);
		},
	}),
	name: makeConfig({
		bytify: (state, config) => {
			Uint8.bytify(state, config.userId);
			Text.bytify(state, config.name);
		},
		parse: (state, config) => {
			config.userId = Uint8.parse(state);
			config.name = Text.parse(state);
		},
	}),
	role: makeConfig({
		bytify: (state, config) => {
			Uint8.bytify(state, config.userId);
			Uint8.bytify(state, config.role);
		},
		parse: (state, config) => {
			config.userId = Uint8.parse(state);
			config.role = Uint8.parse(state);
		},
	}),
	newUser: makeConfig({
		bytify: (state, config) => {
			User.bytify(state, config.user);
		},
		parse: (state, config) => {
			config.user = User.parse(state);
		},
	}),
	userDced: makeConfig({
		bytify: (state, config) => {
			Uint8.bytify(state, config.userId);
		},
		parse: (state, config) => {
			config.userId = Uint8.parse(state);
		},
	}),
	start: makeConfig({bytify: () => {}, parse: () => {}}),
};
