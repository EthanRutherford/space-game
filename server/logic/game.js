const {performance} = require("perf_hooks");
const {Solver} = require("boxjs");
const {physTime, physTimeMs} = require("../../shared/game/constants");
const {GameState} = require("../../shared/game/game-state");
const {createBox} = require("../../shared/game/actions");
const Ship = require("../../shared/game/ship");

module.exports = class Game {
	constructor() {
		const solver = new Solver();
		const shipBody = createBox({x: 0, y: 0, dx: 0, dy: 0});
		const ship = new Ship(shipBody.id);
		solver.addBody(shipBody);

		const frame0 = new GameState(solver, ship);
		this.frameBuffer = [frame0, null, null, null, null];
		this.actionBuffer = [[], null, null, null, null];
		this.oldestUnprocessedAction = 0;
		this.postSolve = null;

		const now = performance.now();
		this.frameZero = Math.floor(now / physTimeMs) * physTimeMs;
		this.frameId = 0;

		this.stepLoop = this.stepLoop.bind(this);
		this.stepLoop();
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
		const gameState = this.frameBuffer[this.frameId - frameId];

		// apply actions and step forward
		while (frameId <= this.frameId) {
			const index = this.frameId - frameId;

			for (const action of this.actionBuffer[index]) {
				if (gameState.solver.bodyMap[action.body.id] == null) {
					gameState.solver.addBody(action.body);
				}
			}

			this.frameBuffer[index] = gameState.fork();
			gameState.solver.solve(physTime);

			frameId++;
		}

		// add current frame to buffer
		this.frameBuffer.unshift(gameState);
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
	getState() {
		const gameState = this.frameBuffer[0];
		return {
			ship: gameState.ship,
			bodies: [...gameState.solver.bodies],
		};
	}
};
