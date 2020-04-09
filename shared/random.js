export const Random = {
	float(min, max) {
		const range = max - min;
		return Math.random() * range + min;
	},
	int(min, max) {
		return Math.floor(Random.float(min, max + 1));
	},
	item(array) {
		return array[Random.int(0, array.length - 1)];
	},
	chance(amount) {
		return Math.random() < amount;
	},
};
