const {performance} = require("perf_hooks");
const {Solver} = require("boxjs");
const {physTime, physTimeMs} = require("../../shared/game/constants");
const GameState = require("../../shared/game/game-state");
const {flyShip} = require("../../shared/game/actions");
const {Ship, DebugBox} = require("../../shared/game/objects");
const {Action} = require("../../shared/serial");

module.exports = class Game {
	constructor() {
		const solver = new Solver();
		const shipBody = Ship.createBody();
		const ship = new Ship(shipBody);
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
				if (action.type === Action.debug) {
					if (gameState.solver.bodyMap[action.body.id] == null) {
						const debugBox = new DebugBox(action.body, action.clientId, frameId);
						gameState.debugBoxes.push(debugBox);
						gameState.solver.addBody(debugBox.body);
					}
				} else if (action.type === Action.flightControls) {
					flyShip(gameState.ship.body, action);
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
	addAction(action, clientId) {
		if (
			action.frameId <= this.frameId &&
			action.frameId > this.frameId - this.frameBuffer.length
		) {
			const index = this.frameId - action.frameId;
			action.clientId = clientId;
			this.actionBuffer[index].push(action);
			this.oldestUnprocessedAction = Math.min(
				this.oldestUnprocessedAction,
				action.frameId,
			);

			if (action.type === Action.debug) {
				action.body = DebugBox.createBody(action);
			}
		}
	}
	getState() {
		const gameState = this.frameBuffer[0];
		return {
			ship: gameState.ship,
			debugBoxes: gameState.debugBoxes,
		};
	}
};
