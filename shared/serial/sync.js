import {Uint32} from "./primitives";
import {Ship, Alien, Asteroid, DebugBox} from "./objects";
import {TypedMap} from "./typed-map";

export const Sync = {
	bytify: (state, frameId, sync) => {
		Uint32.bytify(state, frameId);
		Ship.bytify(state, sync.ship);
		TypedMap.bytify(state, Uint32, Alien, sync.aliens);
		TypedMap.bytify(state, Uint32, Asteroid, sync.asteroids);
		TypedMap.bytify(state, Uint32, DebugBox, sync.debugBoxes);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			ship: Ship.parse(state),
			aliens: TypedMap.parse(state, Uint32, Alien),
			asteroids: TypedMap.parse(state, Uint32, Asteroid),
			debugBoxes: TypedMap.parse(state, Uint32, DebugBox),
		};
	},
};
