const Bool = {
	bytify: (state, value) => {
		state.dataView.setUint8(state.index++, value);
	},
	parse: (state) => {
		return !!state.dataView.getUint8(state.index++);
	},
};

const Uint8 = {
	bytify: (state, value) => {
		state.dataView.setUint8(state.index++, value);
	},
	parse: (state) => {
		return state.dataView.getUint8(state.index++);
	},
};

const Uint16 = {
	bytify: (state, value) => {
		state.dataView.setUint16(state.index, value);
		state.index += 2;
	},
	parse: (state) => {
		const result = state.dataView.getUint16(state.index);
		state.index += 2;
		return result;
	},
};

const Uint32 = {
	bytify: (state, value) => {
		state.dataView.setUint32(state.index, value);
		state.index += 4;
	},
	parse: (state) => {
		const result = state.dataView.getUint32(state.index);
		state.index += 4;
		return result;
	},
};

const Int8 = {
	bytify: (state, value) => {
		state.dataView.setInt8(state.index++, value);
	},
	parse: (state) => {
		return state.dataView.getInt8(state.index++);
	},
};

const Int16 = {
	bytify: (state, value) => {
		state.dataView.setInt16(state.index, value);
		state.index += 2;
	},
	parse: (state) => {
		const result = state.dataView.getInt16(state.index);
		state.index += 2;
		return result;
	},
};

const Int32 = {
	bytify: (state, value) => {
		state.dataView.setInt32(state.index, value);
		state.index += 4;
	},
	parse: (state) => {
		const result = state.dataView.getInt32(state.index);
		state.index += 4;
		return result;
	},
};

const Float = {
	bytify: (state, value) => {
		state.dataView.setFloat32(state.index, value);
		state.index += 4;
	},
	parse: (state) => {
		const result = state.dataView.getFloat32(state.index);
		state.index += 4;
		return result;
	},
};

const Double = {
	bytify: (state, value) => {
		state.dataView.setFloat64(state.index, value);
		state.index += 8;
	},
	parse: (state) => {
		const result = state.dataView.getFloat64(state.index);
		state.index += 8;
		return result;
	},
};

module.exports = {
	Bool, Uint8, Uint16, Uint32,
	Int8, Int16, Int32, Float, Double,
};
