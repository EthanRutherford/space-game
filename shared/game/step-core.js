import {fork} from "boxjs";
import {physTime} from "./constants";
import {flyShip, castLazers} from "./actions";
import {DebugBox} from "./objects";
import {Action} from "../serial/actions";

export function stepCore(gameState, actions, frameId, isServer) {
	for (const action of actions) {
		if (action.type === Action.flightControls) {
			Object.assign(gameState.ship.controls, action);
		} else if (action.type === Action.gunControls) {
			Object.assign(gameState.ship.controls, action);
		} else if (action.type === Action.debug) {
			if (gameState.solver.bodyMap[action.body.id] == null) {
				const body = fork.cloneBody(action.body);
				gameState.solver.addBody(body);

				if (isServer) {
					const debugBox = new DebugBox(body, action.clientId, frameId);
					gameState.debugBoxes.push(debugBox);
				}
			}
		}
	}

	flyShip(gameState.ship.body, gameState.ship.controls);
	const forked = gameState.fork();
	gameState.solver.solve(physTime);

	return forked;
}

export function postStepCore(gameState, isServer) {
	const results = {
		gunAimData: gameState.ship.getGunAimData(),
	};

	if (gameState.ship.controls.firingLazer) {
		results.lazerCastResult = castLazers(gameState.solver, results.gunAimData);
	}

	return results;
}
