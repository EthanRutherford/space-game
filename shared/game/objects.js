import {Math as VectorMath, Body, Shapes} from "boxjs";
import {Brain} from "./ai/brain";
import {VelocityAlignedJoint} from "./velocity-aligned-joint";
const {Vector2D, Rotation} = VectorMath;
const {Polygon, Circle} = Shapes;

const defaultControls = {
	forward: false,
	backward: false,
	left: false,
	right: false,
	aim: new Vector2D(0, 2),
	firingLazer: false,
	enginePower: 1,
	shieldPower: 1,
	gunPower: 1,
	mapPower: 1,
	waypoint: null,
};

export class Ship {
	constructor(body, hp = 100, controls = defaultControls) {
		this.body = body;
		this.hp = hp;
		this.controls = controls;
		this.body.onCollide = this.onCollide.bind(this);
	}
	onCollide(contactData) {
		if (contactData.otherShape.sensor) return;
		// TODO: take damage from collisions
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

export class Alien {
	constructor(body, sensor, hp = 100, brain = new Brain()) {
		this.body = body;
		this.sensor = sensor;
		this.hp = hp;
		this.brain = brain;

		this.neighbors = [];
		this.obstacles = [];
		this.body.onCollide = this.onCollide.bind(this);
		this.sensor.onCollide = this.onCollideObstacleSensor.bind(this);
	}
	onCollide(contactData) {
		if (contactData.otherShape.sensor) return;
		if (contactData.shape === this.body.shapes[0]) {
			// TODO: take damage from collisions
		} else if (contactData.shape === this.body.shapes[1]) {
			this.neighbors.push(contactData.otherShape);
		}
	}
	onCollideObstacleSensor(contactData) {
		if (contactData.otherShape.sensor) return;
		this.obstacles.push(contactData.otherShape);
	}
	static createBodies({position, angle, velocity, angularVelocity} = {}) {
		const body = new Body({
			position, angle,
			velocity, angularVelocity,
			filterGroup: 2,
			exclusionList: [2],
			shapes: [
				/* TODO: define more accurate shape(?) */
				new Circle(1),
				// neighbor sensor
				new Circle(20, true),
			],
		});
		const obstacleSensor = new Body({
			position, angle,
			velocity, angularVelocity,
			filterGroup: 2,
			exclusionList: [2],
			shapes: [
				new Polygon(true).set([
					new Vector2D(-1.1, 0),
					new Vector2D(1.1, 0),
					new Vector2D(1.1, 100),
					new Vector2D(-1.1, 100),
				]),
			],
		});
		const sensorJoint = new VelocityAlignedJoint({
			bodyA: body,
			bodyB: obstacleSensor,
			anchorA: new Vector2D(0, 0),
			anchorB: new Vector2D(0, 0),
		});

		return [body, obstacleSensor, sensorJoint];
	}
}

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
