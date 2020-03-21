const {fork} = require("boxjs");
const {Ship, DebugBox} = require("./objects");

class GameState {
	constructor(solver, ship, debugBoxes = []) {
		this.solver = solver;
		this.ship = ship;
		this.debugBoxes = debugBoxes;
	}
	fork() {
		const newSolver = fork(this.solver);
		const mappedShipBody = this.ship.body && newSolver.bodyMap[this.ship.body.id];
		const newShip = new Ship(mappedShipBody, this.ship.hp);
		const newBoxes = this.debugBoxes.map((box) =>
			new DebugBox(newSolver.bodyMap[box.body.id], box.clientId, box.frameId),
		);
		return new GameState(newSolver, newShip, newBoxes);
	}
}

module.exports = GameState;
