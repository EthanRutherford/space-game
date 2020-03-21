const {
	Math: {Vector2D},
	Body,
	Shapes: {Polygon},
} = require("boxjs");

class Ship {
	constructor(body, hp = 100) {
		this.body = body;
		this.hp = hp;
	}
}
Ship.createBody = ({position, angle, velocity, angularVelocity} = {}) => {
	return new Body({
		position, angle,
		velocity, angularVelocity,
		shapes: [new Polygon().set([
			new Vector2D(-.5, -.5),
			new Vector2D(.5, -.5),
			new Vector2D(0, .5),
		])],
	});
};

class DebugBox {
	constructor(body, clientId, frameId) {
		this.body = body;
		this.clientId = clientId;
		this.frameId = frameId;
	}
}
DebugBox.createBody = ({position, angle, velocity, angularVelocity} = {}) => {
	const body = new Body({
		position, angle,
		velocity, angularVelocity,
		shapes: [new Polygon().setAsBox(.5, .5)],
	});

	return body;
};

module.exports = {Ship, DebugBox};
