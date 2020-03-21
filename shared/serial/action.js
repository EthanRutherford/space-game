const {Bools, Uint8, Uint32} = require("./primitives");
const Vector = require("./vector");

const Debug = {
	bytify: (state, action) => {
		Vector.bytify(state, action.position);
		Vector.bytify(state, action.velocity);
	},
	parse: (state, action) => {
		action.position = Vector.parse(state);
		action.velocity = Vector.parse(state);
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
