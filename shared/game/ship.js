module.exports = class Ship {
	constructor(bodyId, hp = 100) {
		this.bodyId = bodyId;
		this.hp = hp;
	}
	fork() {
		return new Ship(this.bodyId, this.hp);
	}
};
