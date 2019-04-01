const {Uint32, Float} = require("./primitives");

const BodyState = {
	bytify: (state, value) => {
		Uint32.bytify(state, value.id);
		Float.bytify(state, value.position.x);
		Float.bytify(state, value.position.y);
		Float.bytify(state, value.transform.radians);
		Float.bytify(state, value.velocity.x);
		Float.bytify(state, value.velocity.y);
		Float.bytify(state, value.angularVelocity);
	},
	parse: (state) => {
		return {
			id: Uint32.parse(state),
			x: Float.parse(state),
			y: Float.parse(state),
			r: Float.parse(state),
			dx: Float.parse(state),
			dy: Float.parse(state),
			dr: Float.parse(state),
		};
	},
};

module.exports = BodyState;
