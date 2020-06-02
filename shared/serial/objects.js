import {Uint8, Uint32, Float} from "./primitives";
import {BodyState} from "./body-state";
import {FlightControls, GunControls, PowerControls, WaypointControls} from "./actions";

export const Ship = {
	bytify: (state, ship) => {
		BodyState.bytify(state, ship.body);
		Uint8.bytify(state, ship.hp);
		FlightControls.bytify(state, ship.controls);
		GunControls.bytify(state, ship.controls);
		PowerControls.bytify(state, ship.controls);
		WaypointControls.bytify(state, ship.controls);
	},
	parse: (state) => {
		return {
			body: BodyState.parse(state),
			hp: Uint8.parse(state),
			controls: {
				...FlightControls.parse(state),
				...GunControls.parse(state),
				...PowerControls.parse(state),
				...WaypointControls.parse(state),
			},
		};
	},
};

// TODO: sync the brain
export const Alien = {
	bytify: (state, alien) => {
		BodyState.bytify(state, alien.body);
		Uint8.bytify(state, alien.hp);
	},
	parse: (state) => {
		return {
			body: BodyState.parse(state),
			hp: Uint8.parse(state),
		};
	},
};

export const Asteroid = {
	bytify: (state, asteroid) => {
		BodyState.bytify(state, asteroid.body);
		Float.bytify(state, asteroid.radius);
	},
	parse: (state) => {
		return {
			body: BodyState.parse(state),
			radius: Float.parse(state),
		};
	},
};

export const DebugBox = {
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
