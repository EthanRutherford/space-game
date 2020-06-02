import {Random} from "../../random";

const expDecay = (r, d, t) => r * (1 - d) ** t;

// detect data about whether we can see player ship
function getSightData(us, them) {
	const distance = them.body.position.minus(us.body.position).length;
	const canSee = distance < 50;
	return [distance, canSee];
}

// combat confidence from 0 (pessimism) to 1 (optimism)
function getConfidence(us, them) {
	return (100 + us.hp - them.hp) / 200;
}

// see if we can detect player ship signals
function tryDetect(them, distance) {
	const playerLoudness = them.controls.mapPower * 25;
	const tValue = playerLoudness === 0 ? 0 : distance / playerLoudness;
	return Random.chance(expDecay(1, .2, tValue));
}

export const Goals = {
	wander: 0,
	investigate: 1,
	engage: 2,
	retreat: 3,
};

export const newGoal = {
	[Goals.wander]() {
		return {type: Goals.wander, time: 0, angle: 0};
	},
	[Goals.investigate](target) {
		return {type: Goals.investigate, time: 0, target};
	},
	[Goals.engage]() {
		return {type: Goals.engage, time: 0};
	},
	[Goals.retreat]() {
		return {type: Goals.retreat, time: 0};
	},
};

const goalStateMachine = {
	[Goals.wander](currentGoal, us, them) {
		// engage/retreat if in sight
		const [distance, canSee] = getSightData(us, them);
		if (canSee) {
			const confidence = getConfidence(us, them);
			return newGoal[confidence < .25 ? Goals.retreat : Goals.engage]();
		}

		// investigate if signal detected
		if (tryDetect(them, distance)) {
			return newGoal[Goals.investigate](them.body.position.clone());
		}

		// nothing to see here, move along
		return currentGoal;
	},
	[Goals.investigate](currentGoal, us, them) {
		// engage/retreat if in sight
		const [distance, canSee] = getSightData(us, them);
		if (canSee) {
			const confidence = getConfidence(us, them);
			return newGoal[confidence < .25 ? Goals.retreat : Goals.engage]();
		}

		// investigate if signal detected
		if (tryDetect(them, distance)) {
			return newGoal[Goals.investigate](them.body.position.clone());
		}

		// give up if trail goes cold
		if (currentGoal.time > 10) {
			return newGoal[Goals.wander]();
		}

		// continue investigation
		return currentGoal;
	},
	[Goals.engage](currentGoal, us, them) {
		const [, canSee] = getSightData(us, them);
		if (canSee) {
			// retreat if confidence is low
			const confidence = getConfidence(us, them);
			if (confidence < .25) {
				return newGoal[Goals.retreat]();
			}
		} else {
			// switch to investigate with last known position
			return newGoal[Goals.investigate](them.body.position.clone());
		}

		// continue engagement
		return currentGoal;
	},
	[Goals.retreat](currentGoal, us, them) {
		const [, canSee] = getSightData(us, them);
		if (canSee) {
			// re-engage if confidence rises high enough
			const confidence = getConfidence(us, them);
			if (confidence >= .5) {
				return newGoal[Goals.engage]();
			}

			// continue retreating
			currentGoal.time = 0;
			return currentGoal;
		}

		// if confident player is gone, end retreat
		if (currentGoal.time > 2) {
			return newGoal[Goals.wander]();
		}

		// continue retreating
		return currentGoal;
	},
};

export function computeGoal(currentGoal, us, them) {
	return goalStateMachine[currentGoal.type](currentGoal, us, them);
}
