import {Uint32, Float} from "./primitives";
import {Vector} from "./vector";

export const BodyState = {
	bytify: (state, value) => {
		Uint32.bytify(state, value.id);
		Vector.bytify(state, value.position);
		Float.bytify(state, value.transform.radians);
		Vector.bytify(state, value.velocity);
		Float.bytify(state, value.angularVelocity);
	},
	parse: (state) => {
		return {
			id: Uint32.parse(state),
			position: Vector.parse(state),
			radians: Float.parse(state),
			velocity: Vector.parse(state),
			angularVelocity: Float.parse(state),
		};
	},
};
