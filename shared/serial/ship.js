const {Uint8, Uint32} = require("./primitives");

const Ship = {
	bytify: (state, ship) => {
		Uint32.bytify(state, ship.bodyId);
		Uint8.bytify(state, ship.hp);
	},
	parse: (state) => {
		return {
			bodyId: Uint32.parse(state),
			hp: Uint8.parse(state),
		};
	},
};

module.exports = Ship;
