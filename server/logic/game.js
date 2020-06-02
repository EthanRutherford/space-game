import {performance} from "perf_hooks";
import {Math as VectorMath} from "boxjs";
import {physTimeMs} from "Shared/game/constants";
import {GameCore} from "Shared/game/game-core";
import {DebugBox} from "Shared/game/objects";
import {roleIds} from "Shared/game/roles";
import {Action} from "Shared/serial";
import {Random} from "Shared/random";
const {Vector2D, Rotation} = VectorMath;

export class Game {
	constructor() {
		this.gameCore = new GameCore();
		const gameState = this.gameCore.getGameState();

		const center = new Vector2D(0, Random.item([1, -1]) * Random.float(100, 10000));
		const transform = new Rotation(Random.float(-1, 1));
		for (let i = 0; i < 100; i++) {
			const position = center.plus(transform.times(new Vector2D(
				Random.float(-5000, 5000),
				Random.float(-50, 50),
			)));

			const angularVelocity = Random.float(-.1, .1);
			const radius = Random.float(1, 2);
			gameState.addAsteroid({position, angularVelocity}, radius);
		}

		gameState.addAlien({position: new Vector2D(100, 100)});

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

		// replay history
		this.gameCore.doStep(this.oldestUnprocessedAction, this.frameId);

		// call the post-solve action
		if (this.postSolve) {
			this.postSolve(this.frameId);
		}

		// update frameId
		this.frameId++;
		this.oldestUnprocessedAction = this.frameId;
	}
	addAction(action, clientId) {
		if (
			action.frameId <= this.frameId &&
			action.frameId > this.frameId - this.gameCore.length
		) {
			const index = this.frameId - action.frameId;
			action.clientId = clientId;
			this.gameCore.actionBuffer[index].push(action);
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
			this.gameCore.actionBuffer[0].push({
				type: Action.flightControls,
				forward: false,
				backward: false,
				left: false,
				right: false,
			});
		} else if (role === roleIds.gunner) {
			this.gameCore.actionBuffer[0].push({
				type: Action.gunControls,
				firingLazer: false,
			});
		}
	}
	getState() {
		const gameState = this.gameCore.getGameState();
		return {
			ship: gameState.ship,
			aliens: gameState.aliens,
			asteroids: gameState.asteroids,
			debugBoxes: gameState.debugBoxes,
		};
	}
	end() {
		clearTimeout(this.timeout);
	}
}
