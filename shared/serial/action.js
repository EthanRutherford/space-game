const {Bools, Uint8, Uint32, Float} = require("./primitives");

const Debug = {
	bytify: (state, action) => {
		Float.bytify(state, action.x);
		Float.bytify(state, action.y);
		Float.bytify(state, action.dx);
		Float.bytify(state, action.dy);
	},
	parse: (state, action) => {
		action.x = Float.parse(state);
		action.y = Float.parse(state);
		action.dx = Float.parse(state);
		action.dy = Float.parse(state);
	},
};

const FlightControls = {
	bytify: (state, action) => {
		Bools.bytify(state, [
			action.forward,
			action.backward,
			action.left,
			action.right,
		], 4);
	},
	parse: (state, action) => {
		[
			action.forward,
			action.backward,
			action.left,
			action.right,
		] = Bools.parse(state, 4);
	},
};

const ACTION_MAP = [FlightControls];
ACTION_MAP[255] = Debug;
ACTION_MAP.forEach((kind, index) => kind.ID = index);

const Action = {
	bytify: (state, action) => {
		Uint8.bytify(state, action.type);
		Uint32.bytify(state, action.frameId);
		ACTION_MAP[action.type].bytify(state, action);
	},
	parse: (state) => {
		const action = {
			type: Uint8.parse(state),
			frameId: Uint32.parse(state),
		};

		ACTION_MAP[action.type].parse(state, action);
		return action;
	},
	flightControls: FlightControls.ID,
	debug: Debug.ID,
};

module.exports = Action;
