const {Uint32} = require("./primitives");
const BodyState = require("./body-state");
const TypedArray = require("./typed-array");

const Sync = {
	bytify: (state, frameId, bodies) => {
		Uint32.bytify(state, frameId);
		TypedArray.bytify(state, BodyState, bodies);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			updates: TypedArray.parse(state, BodyState),
		};
	},
};

module.exports = Sync;
