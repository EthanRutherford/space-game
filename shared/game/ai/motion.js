import {Math as VectorMath} from "boxjs";
const {Vector2D, clamp, cleanAngle} = VectorMath;

export function doMotion(us, motion) {
	const desiredVelocity = motion.minus(us.body.velocity);
	const desiredVel = us.body.transform.transpose().times(desiredVelocity);
	const strafe = clamp(desiredVel.x, -10, 10);
	const thrust = clamp(desiredVel.y, -25, 50);
	us.body.applyForce(us.body.transform.mul(new Vector2D(strafe, thrust)));

	const desiredAngle = cleanAngle(Math.atan2(-motion.x, motion.y));
	const angDiff = cleanAngle(desiredAngle - us.body.transform.radians);
	const torque = clamp(angDiff * 2 - us.body.angularVelocity, -1, 1) * 10;
	us.body.applyTorque(torque);
	us.body.setAsleep(false);

	// limit max velocity
	if (us.body.velocity.length > 50) {
		us.body.velocity.normalize();
		us.body.velocity.mul(50);
	}
}
