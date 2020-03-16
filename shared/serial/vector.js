const {Math: {Vector2D}} = require("boxjs");
const {Float} = require("./primitives");

const Vector = {
	bytify: (state, vector) => {
		Float.bytify(state, vector.x);
		Float.bytify(state, vector.y);
	},
	parse: (state) => {
		return new Vector2D(Float.parse(state), Float.parse(state));
	},
};

module.exports = Vector;
