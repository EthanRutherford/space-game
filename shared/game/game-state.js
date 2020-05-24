import {fork} from "boxjs";
import {Ship, Asteroid, DebugBox} from "./objects";

export class GameState {
	constructor(solver, ship, asteroids = {}, debugBoxes = {}) {
		this.solver = solver;
		this.ship = ship;
		this.asteroids = asteroids;
		this.debugBoxes = debugBoxes;
	}
	addAsteroid(options, radius) {
		const astBody = Asteroid.createBody(options, radius);
		this.asteroids[astBody.id] = new Asteroid(astBody, radius);
		this.solver.addBody(astBody);
		return this.asteroids[astBody.id];
	}
	addDebugBox(options, clientId = -1, frameId = -1) {
		const boxBody = DebugBox.createBody(options);
		this.debugBoxes[boxBody.id] = new DebugBox(boxBody, clientId, frameId);
		this.solver.addBody(boxBody);
		return this.debugBoxes[boxBody.id];
	}
	fork() {
		const newSolver = fork(this.solver);
		const mappedShipBody = this.ship.body && newSolver.bodyMap[this.ship.body.id];
		const newShip = new Ship(mappedShipBody, this.ship.hp, {...this.ship.controls});

		const newAsteroids = {};
		for (const [id, asteroid] of Object.entries(this.asteroids)) {
			newAsteroids[id] = new Asteroid(newSolver.bodyMap[id], asteroid.radius);
		}

		const newBoxes = {};
		for (const [id, box] of Object.entries(this.debugBoxes)) {
			newBoxes[id] = new DebugBox(newSolver.bodyMap[id], box.clientId, box.frameId);
		}

		return new GameState(newSolver, newShip, newAsteroids, newBoxes);
	}
}
