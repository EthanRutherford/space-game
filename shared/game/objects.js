import {Math as VectorMath, Body, Shapes} from "boxjs";
const {Vector2D, Rotation} = VectorMath;
const {Polygon, Circle} = Shapes;

export class Ship {
	constructor(body, hp = 100, controls = {aim: new Vector2D(0, 2)}) {
		this.body = body;
		this.hp = hp;
		this.controls = controls;
	}
	getGunAimData() {
		const {left, right, tip} = Ship.gunOffsets;
		const {transform, position, mass} = this.body;
		const aim = this.controls.aim;

		const leftOffset = transform.times(left.minus(mass.center));
		const leftAim = aim.minus(leftOffset);
		const leftRotation = new Rotation(Math.atan2(-leftAim.x, leftAim.y));

		const rightOffset = transform.times(right.minus(mass.center));
		const rightAim = aim.minus(rightOffset);
		const rightRotation = new Rotation(Math.atan2(-rightAim.x, rightAim.y));

		return {
			leftPosition: leftOffset.add(position),
			leftRotation,
			rightPosition: rightOffset.add(position),
			rightRotation,
			tip,
		};
	}
	static createBody({position, angle, velocity, angularVelocity} = {}) {
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
	}
}
Ship.gunOffsets = {
	left: new Vector2D(-.5, -.5),
	right: new Vector2D(.5, -.5),
	tip: new Vector2D(0, .35),
};

export class Asteroid {
	constructor(body, radius) {
		this.body = body;
		this.radius = radius;
	}
	static createBody({position, angle, velocity, angularVelocity} = {}, radius = 1) {
		return new Body({
			position, angle,
			velocity, angularVelocity,
			shapes: [new Circle(radius)],
		});
	}
}

export class DebugBox {
	constructor(body, clientId, frameId) {
		this.body = body;
		this.clientId = clientId;
		this.frameId = frameId;
	}
	static createBody({position, angle, velocity, angularVelocity} = {}) {
		const body = new Body({
			position, angle,
			velocity, angularVelocity,
			shapes: [new Polygon().setAsBox(.5, .5)],
		});

		return body;
	}
}
