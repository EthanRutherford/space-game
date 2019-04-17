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

const Init = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.userId);
		TypedArray.bytify(state, User, config.users);
	},
	parse: (state, config) => {
		config.userId = Uint8.parse(state);
		config.users = TypedArray.parse(state, User);
	},
};

const Name = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.userId);
		Text.bytify(state, config.name);
	},
	parse: (state, config) => {
		config.userId = Uint8.parse(state);
		config.name = Text.parse(state);
	},
};

const Role = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.userId);
		Uint8.bytify(state, config.role);
	},
	parse: (state, config) => {
		config.userId = Uint8.parse(state);
		config.role = Uint8.parse(state);
	},
};

const UserDced = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.userId);
	},
	parse: (state, config) => {
		config.userId = Uint8.parse(state);
	},
};

const Start = {bytify: () => {}, parse: () => {}};

const CONFIG_MAP = [Init, Name, Role, User, UserDced, Start];
CONFIG_MAP.forEach((kind, index) => kind.ID = index);

const Config = {
	bytify: (state, config) => {
		Uint8.bytify(state, config.type);
		CONFIG_MAP[config.type].bytify(state, config);
	},
	parse: (state) => {
		const config = {type: Uint8.parse(state)};
		CONFIG_MAP[config.type].parse(state, config);
		return config;
	},
	init: Init.ID,
	name: Name.ID,
	role: Role.ID,
	newUser: User.ID,
	userDced: UserDced.ID,
	start: Start.ID,
};

module.exports = Config;
