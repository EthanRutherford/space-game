const {Uint8} = require("./primitives");
const TypedArray = require("./typed-array");
const Text = require("./text");

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

const Config = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.type);

		if (config.type === Config.init) {
			Uint8.bytify(state, config.userId);
			TypedArray.bytify(state, User, config.users);
		} else if (config.type === Config.name) {
			Uint8.bytify(state, config.userId);
			Text.bytify(state, config.name);
		} else if (config.type === Config.role) {
			Uint8.bytify(state, config.userId);
			Uint8.bytify(state, config.role);
		} else if (config.type === Config.newUser) {
			User.bytify(state, config.user);
		} else if (config.type === Config.userDced) {
			Uint8.bytify(state, config.userId);
		}
	},
	parse: (state) => {
		const config = {type: Uint8.parse(state)};

		if (config.type === Config.init) {
			config.userId = Uint8.parse(state);
			config.users = TypedArray.parse(state, User);
		} else if (config.type === Config.name) {
			config.userId = Uint8.parse(state);
			config.name = Text.parse(state);
		} else if (config.type === Config.role) {
			config.userId = Uint8.parse(state);
			config.role = Uint8.parse(state);
		} else if (config.type === Config.newUser) {
			config.user = User.parse(state);
		} else if (config.type === Config.userDced) {
			config.userId = Uint8.parse(state);
		}

		return config;
	},
	init: 0,
	start: 1,
	name: 2,
	role: 3,
	newUser: 4,
	userDced: 5,
};

module.exports = Config;
