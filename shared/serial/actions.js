import {Bools, Uint8, Uint32} from "./primitives";
import {Vector} from "./vector";

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

const FlightControlsAction = {
	bytify: FlightControls.bytify,
	parse: (state, action) => Object.assign(action, FlightControls.parse(state)),
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

const GunControlsAction = {
	bytify: GunControls.bytify,
	parse: (state, action) => Object.assign(action, GunControls.parse(state)),
};

const ACTION_MAP = [FlightControlsAction, GunControlsAction];
ACTION_MAP[255] = Debug;
ACTION_MAP.forEach((kind, index) => kind.ID = index);

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
	flightControls: FlightControlsAction.ID,
	gunControls: GunControlsAction.ID,
	debug: Debug.ID,
};
