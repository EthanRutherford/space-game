// a Bool is a bit of a last-resort, it uses a full 8 bits to transmit a single bit value
export const Bool = {
	bytify: (state, value) => {
		state.dataView.setUint8(state.index++, value);
	},
	parse: (state) => {
		return !!state.dataView.getUint8(state.index++);
	},
};

// Bools, in comparison, will pack an array of bits into as few bytes as possible
export const Bools = {
	bytify: (state, values, count) => {
		const uint8Count = Math.ceil(count / 8);
		for (let i = 0; i < uint8Count; i++) {
			let bitmask = 0;

			const offset = i * 8;
			for (let j = 0; offset + j < count; j++) {
				if (values[offset + j]) {
					bitmask |= 1 << j;
				}
			}

			state.dataView.setUint8(state.index++, bitmask);
		}
	},
	parse: (state, count) => {
		const uint8Count = Math.ceil(count / 8);
		const values = [];

		for (let i = 0; i < uint8Count; i++) {
			let field = state.dataView.getUint8(state.index++);

			const offset = i * 8;
			for (let j = offset; j < count; j++) {
				values.push(!!(field & 1));
				field >>= 1;
			}
		}

		return values;
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
