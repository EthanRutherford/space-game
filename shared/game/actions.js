import {Math as VectorMath} from "boxjs";
const {Vector2D, clamp} = VectorMath;

export function flyShip(shipBody, controls) {
	// add thrust from engines
	const v = new Vector2D(0, 0);
	if (controls.forward) {
		v.y += 50;
	}
	if (controls.backward) {
		v.y -= 15;
	}

	shipBody.applyForce(shipBody.transform.times(v));

	// apply torque to rotate (or stop rotating)
	let desiredAngVel = 0;
	if (controls.left) {
		desiredAngVel += 5;
	}
	if (controls.right) {
		desiredAngVel -= 5;
	}

	const diff = desiredAngVel - shipBody.angularVelocity;
	const torque = clamp(diff, -1, 1) * 10;
	shipBody.applyTorque(torque);
	shipBody.setAsleep(false);

	// limit max velocity
	if (shipBody.velocity.length > 100) {
		shipBody.velocity.normalize();
		shipBody.velocity.mul(100);
	}

	// bound game between 1000 and -1000
	// TODO: probably will want something more appealing than an invisible rubber-band
	if (shipBody.position.x > 1000) {
		shipBody.velocity.x -= (shipBody.position.x - 1000) * .1;
	}
	if (shipBody.position.x < -1000) {
		shipBody.velocity.x -= (shipBody.position.x + 1000) * .1;
	}
	if (shipBody.position.y > 1000) {
		shipBody.velocity.y -= (shipBody.position.y - 1000) * .1;
	}
	if (shipBody.position.y < -1000) {
		shipBody.velocity.y -= (shipBody.position.y + 1000) * .1;
	}
}

export function castLazers(solver, gunAimData) {
	const {
		leftPosition,
		leftRotation,
		rightPosition,
		rightRotation,
		tip,
	} = gunAimData;

	const beamLength = 50;
	const beam = new Vector2D(0, beamLength);
	const leftTip = leftRotation.times(tip).add(leftPosition);
	const leftEnd = leftRotation.times(beam).add(leftTip);
	const rightTip = rightRotation.times(tip).add(rightPosition);
	const rightEnd = rightRotation.times(beam).add(rightTip);

	const result = {};
	solver.raycast({
		p1: leftTip,
		p2: leftEnd,
		callback(castData) {
			result.leftHit = castData.shape.body;
			result.leftLength = castData.fraction * 50;
		},
	});

	solver.raycast({
		p1: rightTip,
		p2: rightEnd,
		callback(castData) {
			result.rightHit = castData.shape.body;
			result.rightLength = castData.fraction * 50;
		},
	});

	return result;
}
