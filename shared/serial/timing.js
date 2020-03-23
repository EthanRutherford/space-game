import {Double} from "./primitives";

export const Timing = {
	bytify: (state, time) => {
		Double.bytify(state, time);
	},
	parse: (state) => {
		return {
			time: Double.parse(state),
		};
	},
};
