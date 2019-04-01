const {Uint32, Float} = require("./primitives");

// TODO: this isn't a real action, it's for testing

const Action = {
	bytify: (state, frameId, value) => {
		Uint32.bytify(state, frameId);
		Float.bytify(state, value.x);
		Float.bytify(state, value.y);
		Float.bytify(state, value.dx);
		Float.bytify(state, value.dy);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			x: Float.parse(state),
			y: Float.parse(state),
			dx: Float.parse(state),
			dy: Float.parse(state),
		};
	},
};

module.exports = Action;
