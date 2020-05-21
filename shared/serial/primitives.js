// Bool will cleverly pack bits into bytes. When the first bool is written,
// the location is tracked, and further bools will be packed into that same byte
// until it's full. Reading bools operates the same way in reverse.
export const Bool = {
	bytify: (state, value) => {
		if (!(state.bitOffset < 8)) {
			state.bitMask = 0;
			state.bitOffset = 0;
			state.bitIndex = state.index++;
		}

		state.bitMask |= (value ? 1 : 0) << state.bitOffset++;
		state.dataView.setUint8(state.bitIndex, state.bitMask);
	},
	parse: (state) => {
		if (!(state.bitOffset < 8)) {
			state.bitOffset = 0;
			state.bitMask = state.dataView.getUint8(state.index++);
		}

		return !!(state.bitMask & (1 << state.bitOffset++));
	},
};

export const Uint8 = {
	bytify: (state, value) => {
		state.dataView.setUint8(state.index++, value);
	},
	parse: (state) => {
		return state.dataView.getUint8(state.index++);
	},
};

export const Uint16 = {
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

export const Uint32 = {
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

export const Int8 = {
	bytify: (state, value) => {
		state.dataView.setInt8(state.index++, value);
	},
	parse: (state) => {
		return state.dataView.getInt8(state.index++);
	},
};

export const Int16 = {
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

export const Int32 = {
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

export const Float = {
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

export const Double = {
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
