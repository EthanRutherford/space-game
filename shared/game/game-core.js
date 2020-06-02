import {Solver, fork} from "boxjs";
import {Action} from "../serial/actions";
import {physTime} from "./constants";
import {flyShip, castLazers, controlPower} from "./actions";
import {Ship, DebugBox} from "./objects";
import {GameState} from "./game-state";

export class GameCore {
	constructor() {
		// initialize solver data
		const solver = new Solver();
		const shipBody = Ship.createBody();
		const ship = new Ship(shipBody);
		solver.addBody(shipBody);

		const frame0 = new GameState(solver, ship);
		this.frameBuffer = [frame0, null, null, null, null];
		this.actionBuffer = [[], null, null, null, null];
	}
	doStep(frameId, targetFrameId, onPostStep = () => {}) {
		const gameState = this.frameBuffer[targetFrameId - frameId];

		// apply actions and step forward
		while (frameId <= targetFrameId) {
			// process alien ai for current frame only
			if (frameId === targetFrameId) {
				for (const alien of Object.values(gameState.aliens)) {
					alien.brain.compute(alien, gameState.ship, physTime);
				}
			}

			const index = targetFrameId - frameId;
			this.frameBuffer[index] = stepCore(
				gameState,
				this.actionBuffer[index],
				frameId,
			);

			onPostStep(frameId, gameState);
			const postStep = postStepCore(gameState);
			this.gunAimData = postStep.gunAimData;
			this.lazerCastResult = postStep.lazerCastResult;

			frameId++;
		}

		// add current frame to buffer
		this.frameBuffer.unshift(gameState);
		this.frameBuffer.pop();
		this.actionBuffer.unshift([]);
		return this.actionBuffer.pop();
	}
	getGameState() {
		return this.frameBuffer[0];
	}
	get length() {
		return this.frameBuffer.length;
	}
}

function stepCore(gameState, actions, frameId) {
	const forked = gameState.fork();

	for (const action of actions) {
		if (action.type === Action.flightControls) {
			Object.assign(gameState.ship.controls, action);
		} else if (action.type === Action.gunControls) {
			Object.assign(gameState.ship.controls, action);
		} else if (action.type === Action.powerControls) {
			Object.assign(gameState.ship.controls, controlPower(action));
		} else if (action.type === Action.waypointControls) {
			Object.assign(gameState.ship.controls, action);
		} else if (action.type === Action.debug) {
			if (gameState.solver.bodyMap[action.body.id] == null) {
				const body = fork.cloneBody(action.body);
				gameState.solver.addBody(body);

				if (IS_SERVER) {
					const debugBox = new DebugBox(body, action.clientId, frameId);
					gameState.debugBoxes[body.id] = debugBox;
				}
			}
		}
	}

	flyShip(gameState.ship.body, gameState.ship.controls);
	for (const alien of Object.values(gameState.aliens)) {
		alien.brain.perform(alien);
		alien.neighbors.length = 0;
		alien.obstacles.length = 0;
	}

	gameState.solver.solve(physTime);

	return forked;
}

function postStepCore(gameState) {
	const results = {
		gunAimData: gameState.ship.getGunAimData(),
	};

	if (gameState.ship.controls.firingLazer && gameState.ship.controls.gunPower !== 0) {
		results.lazerCastResult = castLazers(gameState.solver, results.gunAimData);
	}

	return results;
}
