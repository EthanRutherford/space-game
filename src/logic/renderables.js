import {ImageLoader, rgba, builtIn} from "2d-gl";
import shipUrl from "../images/ship.png";
import gunUrl from "../images/gun.png";
const {Shape, VectorMaterial, SpriteMaterial} = builtIn;

const spriteLoader = new ImageLoader();

// preload sprites
const sprites = {};
const getSprite = (name, url) => spriteLoader.get(name, url).then((x) => sprites[name] = x);
getSprite("ship", shipUrl);
getSprite("gun", gunUrl);

function singleton(create) {
	let func = (...args) => {
		const result = create(...args);
		func = () => result;
		return result;
	};

	return (...args) => func(...args);
}

const getExhaustMaterial = singleton(() => new VectorMaterial([
	rgba(.1, .2, 1, 1),
	rgba(.8, 0, .2, 1),
	rgba(.8, .6, 0, 1),
	rgba(.8, 0, .2, 1),
]));
function makeExhaustRenderable(renderer, x, y, r) {
	const verts = [
		{x: 0, y: 0},
		{x: -.05, y: -.05},
		{x: 0, y: -.5},
		{x: .05, y: -.05},
	];

	const exhaustShape = new Shape(verts);
	const exhaustMaterial = getExhaustMaterial();
	const exhaust = renderer.getInstance(exhaustShape, exhaustMaterial);
	exhaust.x = x;
	exhaust.y = y;
	exhaust.r = r;

	exhaust.update = () => {
		const newVerts = verts.map((v) => ({...v}));
		newVerts[2].x += (Math.floor(Math.random() * 3) - 1) * .01;
		newVerts[2].y += (Math.floor(Math.random() * 3) - 1) * .01;
		exhaustShape.update(newVerts);
	};

	return exhaust;
}

const getGunComponents = singleton(() => {
	const size = .25;
	const left = -size / 2;
	const right = left + size;
	const bottom = -size / 4;
	const top = bottom + size;

	return {
		gunShape: new Shape([
			{x: left, y: bottom},
			{x: right, y: bottom},
			{x: right, y: top},
			{x: left, y: top},
		]),
		gunMaterial: new SpriteMaterial(
			[{x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}],
			sprites.gun,
			false,
		),
	};
});
function makeGunRenderable(renderer, x, y, r) {
	const {gunShape, gunMaterial} = getGunComponents();
	const gun = renderer.getInstance(gunShape, gunMaterial);
	gun.x = x;
	gun.y = y;
	gun.r = r;

	gun.update = () => {};

	return gun;
}

const getShipComponents = singleton(() => ({
	shipShape: new Shape([
		{x: -.5, y: -.5}, {x: .5, y: -.5}, {x: .5, y: .5}, {x: -.5, y: .5},
	]),
	shipMaterial: new SpriteMaterial(
		[{x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}],
		sprites.ship,
		false,
	),
}));
export function makeShipRenderable(renderer, getCurrentShip) {
	const {shipShape, shipMaterial} = getShipComponents();
	const ship = renderer.getInstance(shipShape, shipMaterial);
	const exhausts = [
		makeExhaustRenderable(renderer, -.0625, -.5, 0),
		makeExhaustRenderable(renderer, +.0625, -.5, 0),
	];
	const guns = [
		makeGunRenderable(renderer, -.25, -.25, 0),
		makeGunRenderable(renderer, +.25, -.25, 0),
	];

	ship.update = () => {
		for (const exhaust of exhausts) {
			exhaust.update();
		}
		for (const gun of guns) {
			gun.update();
		}
	};
	ship.getChildren = () => {
		return getCurrentShip().controls.forward ? exhausts.concat(guns) : guns;
	};

	return ship;
}

const getDebugBoxComponents = singleton(() => {
	const blue = rgba(0, 0, 1, 1);
	return {
		boxShape: new Shape([
			{x: -.5, y: -.5}, {x: .5, y: -.5}, {x: .5, y: .5}, {x: -.5, y: .5},
		]),
		boxMaterial: new VectorMaterial(
			[blue, blue, blue, blue],
			VectorMaterial.triangleFan,
		),
	};
});
export function makeDebugBoxRenderable(renderer) {
	const {boxShape, boxMaterial} = getDebugBoxComponents();
	return renderer.getInstance(boxShape, boxMaterial);
}

export const spritesPromise = spriteLoader.all();
