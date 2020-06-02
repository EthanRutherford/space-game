import {Math as VectorMath, Joints} from "boxjs";
const {cleanAngle} = VectorMath;

/** VelocityAlignedJoint
 * this custom joint is used for obstacle avoidance. Normally, sensors are pinned
 * to a body and are oriented in the same orientation as the parent body at all times.
 * However, due to inertia and a lack of resistive forces in space, obstacles in our
 * way are defined not as "things which are in front of us", but rather "things which
 * are along the line of our current velocity"
 *
 * This joint therefore does not use physics simulation to resolve joint constraints,
 * but instead locks the second body to the first at the anchor position on each, and
 * sets the orientation of the second body to match the direction of velocity
 */
export class VelocityAlignedJoint extends Joints.Joint {
	constructor({bodyA, bodyB, anchorA, anchorB}) {
		super({bodyA, bodyB, anchorA, anchorB});
	}
	initialize() {/* do nothing */}
	applyImpulse() {/* do nothing */}
	positionalCorrection() {
		// update the angle of B based on the velocity of A
		const velocity = this.bodyA.velocity;
		const angle = cleanAngle(Math.atan2(-velocity.x, velocity.y));
		this.bodyB.transform.radians = angle;

		// update the position of B to align anchor points
		const anchorA = this.bodyA.transform.times(this.anchorA).add(this.bodyA.position);
		const anchorB = this.bodyB.transform.times(this.anchorB).add(this.bodyB.position);
		this.bodyB.position.add(anchorA.sub(anchorB));
	}
	clone(bodyA, bodyB) {
		const clone = Object.create(VelocityAlignedJoint.prototype);
		Joints.Joint.clone(clone, this, bodyA, bodyB);
		return clone;
	}
}
