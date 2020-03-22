const {Uint8, Uint32} = require("./primitives");
const BodyState = require("./body-state");
const {FlightControls} = require("./actions");

const Ship = {
	bytify: (state, ship) => {
		BodyState.bytify(state, ship.body);
		Uint8.bytify(state, ship.hp);
		FlightControls.bytify(state, ship.controls);
	},
	parse: (state) => {
		return {
			body: BodyState.parse(state),
			hp: Uint8.parse(state),
			controls: FlightControls.parse(state),
		};
	},
};

const DebugBox = {
	bytify: (state, box) => {
		BodyState.bytify(state, box.body);
		Uint8.bytify(state, box.clientId);
		Uint32.bytify(state, box.frameId);
	},
	parse: (state) => {
		return {
			body: BodyState.parse(state),
			clientId: Uint8.parse(state),
			frameId: Uint32.parse(state),
		};
	},
};

module.exports = {Ship, DebugBox};
