const {Uint32} = require("./primitives");
const {Ship, DebugBox} = require("./objects");
const TypedArray = require("./typed-array");

const Sync = {
	bytify: (state, frameId, sync) => {
		Uint32.bytify(state, frameId);
		Ship.bytify(state, sync.ship);
		TypedArray.bytify(state, DebugBox, sync.debugBoxes);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			ship: Ship.parse(state),
			debugBoxes: TypedArray.parse(state, DebugBox),
		};
	},
};

module.exports = Sync;
