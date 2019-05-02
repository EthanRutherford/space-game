const {Uint32} = require("./primitives");

const ActionAck = {
	bytify: (state, action) => {
		Uint32.bytify(state, action.frameId);
		Uint32.bytify(state, action.body.id);
	},
	parse: (state) => {
		return {
			frameId: Uint32.parse(state),
			bodyId: Uint32.parse(state),
		};
	},
};

module.exports = ActionAck;
