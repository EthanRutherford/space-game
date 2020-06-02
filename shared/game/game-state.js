import {fork} from "boxjs";
import {Brain} from "./ai/brain";
import {Ship, Alien, Asteroid, DebugBox} from "./objects";

export class GameState {
	constructor(solver, ship, aliens = {}, asteroids = {}, debugBoxes = {}) {
		this.solver = solver;
		this.ship = ship;
		this.aliens = aliens;
		this.asteroids = asteroids;
		this.debugBoxes = debugBoxes;
	}
	addAlien(options, hp = 100) {
		const [alienBody, sensor, joint] = Alien.createBodies(options);
		this.aliens[alienBody.id] = new Alien(alienBody, sensor, hp);
		this.solver.addBody(alienBody);
		this.solver.addBody(sensor);
		this.solver.addJoint(joint);
		return this.aliens[alienBody.id];
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

		const newAliens = {};
		for (const [id, alien] of Object.entries(this.aliens)) {
			const newSensor = newSolver.bodyMap[alien.sensor.id];
			const newBrain = new Brain(alien.brain.goal, alien.brain.action);
			newAliens[id] = new Alien(newSolver.bodyMap[id], newSensor, alien.hp, newBrain);
		}

		const newAsteroids = {};
		for (const [id, asteroid] of Object.entries(this.asteroids)) {
			newAsteroids[id] = new Asteroid(newSolver.bodyMap[id], asteroid.radius);
		}

		const newBoxes = {};
		for (const [id, box] of Object.entries(this.debugBoxes)) {
			newBoxes[id] = new DebugBox(newSolver.bodyMap[id], box.clientId, box.frameId);
		}

		return new GameState(newSolver, newShip, newAliens, newAsteroids, newBoxes);
	}
}
