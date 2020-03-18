const {fork} = require("boxjs");

class GameState {
	constructor(solver, ship) {
		this.solver = solver;
		this.ship = ship;
	}
	fork() {
		const newSolver = fork(this.solver);
		const newShip = this.ship.fork();
		return new GameState(newSolver, newShip);
	}
}

module.exports = {GameState};
