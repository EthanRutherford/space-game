const {Uint8, Uint32, Float} = require("./primitives");

const Debug = {
	bytify: (state, action) => {
		Uint32.bytify(state, action.frameId);
		Float.bytify(state, action.x);
		Float.bytify(state, action.y);
		Float.bytify(state, action.dx);
		Float.bytify(state, action.dy);
	},
	parse: (state, action) => {
		action.frameId = Uint32.parse(state);
		action.x = Float.parse(state);
		action.y = Float.parse(state);
		action.dx = Float.parse(state);
		action.dy = Float.parse(state);
	},
};

const ACTION_MAP = [];
ACTION_MAP[255] = Debug;
ACTION_MAP.forEach((kind, index) => kind.ID = index);

const Action = {
	bytify: (state, action) => {
		Uint8.bytify(state, action.type);
		ACTION_MAP[action.type].bytify(state, action);
	},
	parse: (state) => {
		const action = {type: Uint8.parse(state)};
		ACTION_MAP[action.type].parse(state, action);
		return action;
	},
	debug: Debug.ID,
};

module.exports = Action;
