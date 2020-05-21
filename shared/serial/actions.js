import {Bool, Uint8, Uint32} from "./primitives";
import {Vector} from "./vector";

export const FlightControls = {
	bytify: (state, action) => {
		Bool.bytify(state, action.forward);
		Bool.bytify(state, action.backward);
		Bool.bytify(state, action.left);
		Bool.bytify(state, action.right);
	},
	parse: (state) => {
		return {
			forward: Bool.parse(state),
			backward: Bool.parse(state),
			left: Bool.parse(state),
			right: Bool.parse(state),
		};
	},
};

export const GunControls = {
	bytify: (state, action) => {
		Vector.bytify(state, action.aim);
		Bool.bytify(state, action.firingLazer);
	},
	parse: (state) => {
		return {
			aim: Vector.parse(state),
			firingLazer: Bool.parse(state),
		};
	},
};

export const PowerControls = {
	bytify: (state, action) => {
		Uint8.bytify(state, action.enginePower);
		Uint8.bytify(state, action.shieldPower);
		Uint8.bytify(state, action.gunPower);
		Uint8.bytify(state, action.mapPower);
	},
	parse: (state) => {
		return {
			enginePower: Uint8.parse(state),
			shieldPower: Uint8.parse(state),
			gunPower: Uint8.parse(state),
			mapPower: Uint8.parse(state),
		};
	},
};

const Debug = {
	bytify: (state, action) => {
		Vector.bytify(state, action.position);
		Vector.bytify(state, action.velocity);
	},
	parse: (state) => {
		return {
			position: Vector.parse(state),
			velocity: Vector.parse(state),
		};
	},
};

const ACTION_MAP = [];
function makeAction({bytify, parse}) {
	ACTION_MAP.push({bytify, parse: (state, action) => Object.assign(action, parse(state))});
	return ACTION_MAP.length - 1;
}

export const Action = {
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
	flightControls: makeAction(FlightControls),
	gunControls: makeAction(GunControls),
	powerControls: makeAction(PowerControls),
	debug: makeAction(Debug),
};
