import {Bools, Uint8, Uint32} from "./primitives";
import {Vector} from "./vector";

export const FlightControls = {
	bytify: (state, action) => {
		Bools.bytify(state, [
			action.forward,
			action.backward,
			action.left,
			action.right,
		], 4);
	},
	parse: (state) => {
		const bools = Bools.parse(state, 4);
		return {
			forward: bools[0],
			backward: bools[1],
			left: bools[2],
			right: bools[3],
		};
	},
};

export const GunControls = {
	bytify: (state, action) => {
		Vector.bytify(state, action.aim);
		Bools.bytify(state, [
			action.firingLazer,
		], 1);
	},
	parse: (state) => {
		const aim = Vector.parse(state);
		const bools = Bools.parse(state, 1);
		return {
			aim,
			firingLazer: bools[0],
		};
	},
};

export const EngineerControls = {
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
	engineerControls: makeAction(EngineerControls),
	debug: makeAction(Debug),
};
