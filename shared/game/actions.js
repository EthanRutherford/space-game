import {Math as VectorMath} from "boxjs";
const {Vector2D, clamp} = VectorMath;

export function flyShip(shipBody, controls) {
	// add thrust from engines
	const v = new Vector2D(0, 0);
	if (controls.forward) {
		v.y += 10;
	}
	if (controls.backward) {
		v.y -= 2;
	}

	shipBody.applyForce(shipBody.transform.times(v));

	// apply torque to rotate (or stop rotating)
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

	// limit max velocity
	if (shipBody.velocity.length > 100) {
		shipBody.velocity.normalize();
		shipBody.velocity.mul(100);
	}
}
