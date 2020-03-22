const {
	Math: {Vector2D},
	Body,
	Shapes: {Polygon},
} = require("boxjs");

class Ship {
	constructor(body, hp = 100, controls = {}) {
		this.body = body;
		this.hp = hp;
		this.controls = controls;
	}
}
Ship.createBody = ({position, angle, velocity, angularVelocity} = {}) => {
	return new Body({
		position, angle,
		velocity, angularVelocity,
		shapes: [new Polygon().set([
			new Vector2D(-.4375, -.125),
			new Vector2D(-.4375, -.25),
			new Vector2D(-.125, -.46875),
			new Vector2D(.125, -.46875),
			new Vector2D(.4375, -.25),
			new Vector2D(.4375, -.125),
			new Vector2D(.03125, .46875),
			new Vector2D(-.03125, .46875),
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
