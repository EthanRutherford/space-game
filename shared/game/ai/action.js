import {Math as VectorMath} from "boxjs";
import {Random} from "../../random";
import {Goals} from "./goal";
const {Vector2D, Rotation} = VectorMath;

function clampVec(v, max) {
	const length = v.length;
	return v.length > max ? v.mul(max / length) : v;
}

function doWander(goal, speed) {
	goal.angle += Random.float(-.02, .02);
	const rot = new Rotation(goal.angle);
	return rot.times(new Vector2D(0, speed));
}

function doSeek(us, targetPos) {
	return targetPos.minus(us.body.position);
}
function doFlee(us, targetPos) {
	return doSeek(us, targetPos).negate();
}

function doAvoid(us, them) {
	const velocity = us.body.velocity;
	let toObstacle = null;
	let lsqr = velocity.lsqr * 8;
	for (const obstacle of us.obstacles) {
		if (obstacle.body === them.body) continue;

		const v = obstacle.body.position.minus(us.body.position);
		const {min, max} = obstacle.aabb;
		const rsqr = (max.x - min.x) * (max.y - min.y);
		const distance = v.lsqr - rsqr;
		if (distance < lsqr) {
			toObstacle = v;
			lsqr = distance;
		}
	}

	if (toObstacle == null) {
		return null;
	}

	// steer perpendicular to current velocity, away from obstacle
	const sideness = toObstacle.cross(velocity);
	if (sideness < 0) {
		return new Vector2D(velocity.y * 10, -velocity.x * 10);
	}

	return new Vector2D(-velocity.y * 10, velocity.x * 10);
}

function doOffsetPursue(us, them) {
	// target offset perpendicular from them, on the side we're already heading toward
	const toTarget = them.body.position.minus(us.body.position);
	const sideness = toTarget.cross(us.body.velocity);
	if (sideness < 0) {
		toTarget.negate();
	}

	const offset = new Vector2D(-toTarget.y, toTarget.x).normalize().mul(4);
	const offsetPos = them.body.position.plus(offset);
	const projectedPosition = offsetPos.plus(them.body.velocity.times(toTarget.length * .1));
	return doSeek(us, projectedPosition);
}
function doEvade(us, them) {
	const distance = us.body.position.minus(them.body.position).length;
	const projectedPosition = them.body.position.plus(them.body.velocity.times(distance * .1));
	return doFlee(us, projectedPosition);
}

const goalToAction = {
	[Goals.wander](goal) {
		return doWander(goal, 25);
	},
	[Goals.investigate](goal, us) {
		return clampVec(doSeek(us, goal.target), 25);
	},
	[Goals.engage](_, us, them) {
		return doOffsetPursue(us, them);
	},
	[Goals.retreat](_, us, them) {
		return doEvade(us, them);
	},
};

export function computeAction(goal, us, them) {
	const avoid = doAvoid(us, them);
	if (avoid != null) {
		return avoid;
	}

	return goalToAction[goal.type](goal, us, them);
}
