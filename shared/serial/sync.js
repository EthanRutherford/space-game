import {Uint32} from "./primitives";
import {Ship, DebugBox, Asteroid} from "./objects";
import {TypedArray} from "./typed-array";

export const Sync = {
	bytify: (state, frameId, sync) => {
		Uint32.bytify(state, frameId);
		Ship.bytify(state, sync.ship);
		TypedArray.bytify(state, Asteroid, sync.asteroids);
		TypedArray.bytify(state, DebugBox, sync.debugBoxes);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			ship: Ship.parse(state),
			asteroids: TypedArray.parse(state, Asteroid),
			debugBoxes: TypedArray.parse(state, DebugBox),
		};
	},
};
