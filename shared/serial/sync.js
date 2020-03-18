const {Uint32} = require("./primitives");
const Ship = require("./ship");
const BodyState = require("./body-state");
const TypedArray = require("./typed-array");

const Sync = {
	bytify: (state, frameId, sync) => {
		Uint32.bytify(state, frameId);
		Ship.bytify(state, sync.ship);
		TypedArray.bytify(state, BodyState, sync.bodies);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			ship: Ship.parse(state),
			bodies: TypedArray.parse(state, BodyState),
		};
	},
};

module.exports = Sync;
