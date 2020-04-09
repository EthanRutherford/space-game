import {performance} from "perf_hooks";
import {Solver, Math as VectorMath} from "boxjs";
import {physTimeMs} from "Shared/game/constants";
import {stepCore, postStepCore} from "Shared/game/step-core";
import {GameState} from "Shared/game/game-state";
import {Ship, Asteroid, DebugBox} from "Shared/game/objects";
import {roleIds} from "Shared/game/roles";
import {Action} from "Shared/serial";
import {Random} from "Shared/random";
const {Vector2D, Rotation} = VectorMath;

export class Game {
	constructor() {
		const solver = new Solver();
		const shipBody = Ship.createBody();
		const ship = new Ship(shipBody);
		solver.addBody(shipBody);

		const center = new Vector2D(0, Random.item([1, -1]) * Random.float(100, 10000));
		const transform = new Rotation(Random.float(-1, 1));
		const asteroids = [];
		for (let i = 0; i < 100; i++) {
			const position = center.plus(transform.times(new Vector2D(
				Random.float(-5000, 5000),
				Random.float(-50, 50),
			)));

			const angularVelocity = Random.float(-.1, .1);
			const radius = Random.float(1, 2);
			const astBody = Asteroid.createBody({position, angularVelocity}, radius);
			asteroids.push(new Asteroid(astBody, radius));
			solver.addBody(astBody);
		}

		const frame0 = new GameState(solver, ship, asteroids);
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
		this.timeout = setTimeout(this.stepLoop, nextFrameTime - now);

		// prepare to replay history
		let frameId = this.oldestUnprocessedAction;
		const gameState = this.frameBuffer[this.frameId - frameId];

		// apply actions and step forward
		while (frameId <= this.frameId) {
			const index = this.frameId - frameId;
			this.frameBuffer[index] = stepCore(
				gameState,
				this.actionBuffer[index],
				frameId,
				true,
			);

			postStepCore(gameState, true);

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
	handleDisconnected(role) {
		if (role === roleIds.pilot) {
			this.actionBuffer[0].push({
				type: Action.flightControls,
				forward: false,
				backward: false,
				left: false,
				right: false,
			});
		} else if (role === roleIds.gunner) {
			this.actionBuffer[0].push({
				type: Action.gunControls,
				firingLazer: false,
			});
		}
	}
	getState() {
		const gameState = this.frameBuffer[0];
		return {
			ship: gameState.ship,
			asteroids: gameState.asteroids,
			debugBoxes: gameState.debugBoxes,
		};
	}
	end() {
		clearTimeout(this.timeout);
	}
}
