const {performance} = require("perf_hooks");
const {fork, Solver} = require("boxjs");
const {physTime, physTimeMs} = require("../../shared/game/constants");
const {createBox} = require("../../shared/game/actions");
const Ship = require("../../shared/game/ship");

module.exports = class Game {
	constructor() {
		this.postSolve = null;

		this.frameBuffer = [new Solver(), null, null, null, null];
		this.actionBuffer = [[], null, null, null, null];
		this.oldestUnprocessedAction = 0;

		const now = performance.now();
		this.frameZero = Math.floor(now / physTimeMs) * physTimeMs;
		this.frameId = 0;

		this.stepLoop = this.stepLoop.bind(this);
		this.stepLoop();

		this.nextKey = 0;

		// game data
		const shipBody = createBox({x: 0, y: 0, dx: 0, dy: 0});
		this.frameBuffer[0].addBody(shipBody);
		this.ship = new Ship(shipBody.id);
	}
	stepLoop() {
		// compensate for drift by scheduling using when
		// the next frame *should* be
		const now = performance.now();
		const nextFrameId = this.frameId + 1;
		const nextFrameTime = this.frameZero + (nextFrameId * physTimeMs);
		setTimeout(this.stepLoop, nextFrameTime - now);

		// prepare to replay history
		let frameId = this.oldestUnprocessedAction;
		const solver = this.frameBuffer[this.frameId - frameId];

		// apply actions and step forward
		while (frameId <= this.frameId) {
			const index = this.frameId - frameId;

			for (const action of this.actionBuffer[index]) {
				if (solver.bodyMap[action.body.id] == null) {
					solver.addBody(action.body);
				}
			}

			this.frameBuffer[index] = fork(solver);
			solver.solve(physTime);

			frameId++;
		}

		// add current frame to buffer
		this.frameBuffer.unshift(solver);
		this.frameBuffer.pop();
		this.actionBuffer.unshift([]);
		this.actionBuffer.pop();

		// call the post-solve action
		if (this.postSolve) {
			this.postSolve(this.frameId);
		}

		// update frameId
		this.frameId = frameId;
		this.oldestUnprocessedAction = this.frameId;
	}
	tryAddAction(action) {
		if (
			action.frameId <= this.frameId &&
			action.frameId > this.frameId - this.frameBuffer.length
		) {
			const index = this.frameId - action.frameId;
			action.body = createBox(action);
			this.actionBuffer[index].push(action);
			this.oldestUnprocessedAction = Math.min(
				this.oldestUnprocessedAction,
				action.frameId,
			);

			return true;
		}

		return false;
	}
	getBodies() {
		return this.frameBuffer[0].bodies;
	}
};
