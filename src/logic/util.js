const {Math: {Vector2D}} = require("boxjs");

function lerp(a, b, ratio) {
	return (a * (1 - ratio)) + (b * ratio);
}
function vLerp(a, b, ratio) {
	return new Vector2D(lerp(a.x, b.x, ratio), lerp(a.y, b.y, ratio));
}
function aLerp(a, b, ratio) {
	const diff = Math.abs(a - b);
	if (diff > Math.PI) {
		if (a > b) {
			b += 2 * Math.PI;
		} else {
			a += 2 * Math.PI;
		}
	}
	return lerp(a, b, ratio);
}

module.exports = {
	lerp,
	vLerp,
	aLerp,
};
