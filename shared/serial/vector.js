import {Math as VectorMath} from "boxjs";
import {Float} from "./primitives";
const {Vector2D} = VectorMath;

export const Vector = {
	bytify: (state, vector) => {
		Float.bytify(state, vector.x);
		Float.bytify(state, vector.y);
	},
	parse: (state) => {
		return new Vector2D(Float.parse(state), Float.parse(state));
	},
};
