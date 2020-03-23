import {Math as VectorMath} from "boxjs";
const {Vector2D} = VectorMath;

export function lerp(a, b, ratio) {
	return (a * (1 - ratio)) + (b * ratio);
}
export function vLerp(a, b, ratio) {
	return new Vector2D(lerp(a.x, b.x, ratio), lerp(a.y, b.y, ratio));
}
export function aLerp(a, b, ratio) {
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
