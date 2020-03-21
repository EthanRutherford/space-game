const {Math: {Vector2D, clamp}} = require("boxjs");

function flyShip(shipBody, controls) {
	const v = new Vector2D(0, 0);
	if (controls.forward) {
		v.y += 10;
	}
	if (controls.backward) {
		v.y -= 2;
	}

	shipBody.applyForce(shipBody.transform.times(v));

	let desiredAngVel = 0;
	if (controls.left) {
		desiredAngVel += 4;
	}
	if (controls.right) {
		desiredAngVel -= 4;
	}

	const diff = desiredAngVel - shipBody.angularVelocity;
	const torque = clamp(diff, -1, 1);
	shipBody.applyTorque(torque);
	shipBody.setAsleep(false);
}

module.exports = {flyShip};
