import {fork} from "boxjs";
import {Ship, Asteroid, DebugBox} from "./objects";

export class GameState {
	constructor(solver, ship, asteroids = [], debugBoxes = []) {
		this.solver = solver;
		this.ship = ship;
		this.asteroids = asteroids;
		this.debugBoxes = debugBoxes;
	}
	addAsteroid(options, radius) {
		const astBody = Asteroid.createBody(options, radius);
		this.asteroids.push(new Asteroid(astBody, radius));
		this.solver.addBody(astBody);
	}
	fork() {
		const newSolver = fork(this.solver);
		const mappedShipBody = this.ship.body && newSolver.bodyMap[this.ship.body.id];
		const newShip = new Ship(mappedShipBody, this.ship.hp, {...this.ship.controls});
		const newAsteroids = this.asteroids.map((asteroid) =>
			new Asteroid(newSolver.bodyMap[asteroid.body.id], asteroid.radius),
		);
		const newBoxes = this.debugBoxes.map((box) =>
			new DebugBox(newSolver.bodyMap[box.body.id], box.clientId, box.frameId),
		);
		return new GameState(newSolver, newShip, newAsteroids, newBoxes);
	}
}
