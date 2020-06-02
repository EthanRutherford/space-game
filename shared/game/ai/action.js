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
	let nearest = null;
	let vector = null;
	let lsqr = Infinity;
	for (const obstacle of us.obstacles) {
		if (obstacle.body === them.body) continue;

		const v = obstacle.body.position.minus(us.body.position);
		const distance = v.lsqr;
		if (distance < lsqr) {
			nearest = obstacle;
			vector = v;
			lsqr = distance;
		}
	}

	if (nearest == null) {
		return null;
	}

	// steer perpendicular to the obstacle
	vector.normalize();
	const localDir = us.body.transform.transpose().times(vector);
	if (localDir.x < 0) {
		vector.negate();
	}

	return new Vector2D(-vector.y, vector.x).mul(50);
}

function doOffsetPursue(us, them) {
	const toTarget = them.body.position.minus(us.body.position);
	const localDir = us.body.transform.transpose().times(toTarget);
	if (localDir.x < 0) {
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
