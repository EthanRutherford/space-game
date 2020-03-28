import {Math as VectorMath, Body, Shapes} from "boxjs";
const {Vector2D} = VectorMath;
const {Polygon, Circle} = Shapes;

export class Ship {
	constructor(body, hp = 100, controls = {aim: new Vector2D(0, 2)}) {
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
			new Vector2D(-.875, -.25),
			new Vector2D(-.875, -.5),
			new Vector2D(-.25, -.9375),
			new Vector2D(.25, -.9375),
			new Vector2D(.875, -.5),
			new Vector2D(.875, -.25),
			new Vector2D(.0625, .9375),
			new Vector2D(-.0625, .9375),
		])],
	});
};

export class Asteroid {
	constructor(body, radius) {
		this.body = body;
		this.radius = radius;
	}
}
Asteroid.createBody = ({position, angle, velocity, angularVelocity} = {}, radius = 1) => {
	return new Body({
		position, angle,
		velocity, angularVelocity,
		shapes: [new Circle(radius)],
	});
};

export class DebugBox {
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
