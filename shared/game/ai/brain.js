import {Goals, newGoal, computeGoal} from "./goal";
import {computeAction} from "./action";
import {doMotion} from "./motion";

export class Brain {
	constructor(goal = newGoal[Goals.wander](0), action = null) {
		this.goal = goal;
		this.action = action;
	}
	compute(us, them, dt) {
		this.goal.time += dt;

		this.goal = computeGoal(this.goal, us, them);
		this.action = computeAction(this.goal, us, them);
	}
	perform(us) {
		if (this.action != null) {
			doMotion(us, this.action);
		}
	}
}
