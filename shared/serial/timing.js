const {Double} = require("./primitives");

const Timing = {
	bytify: (state, time) => {
		Double.bytify(state, time);
	},
	parse: (state) => {
		return {
			time: Double.parse(state),
		};
	},
};

module.exports = Timing;
