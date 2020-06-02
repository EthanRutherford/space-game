import {ImageLoader, rgba, builtIn} from "2d-gl";
import {Math as VectorMath} from "boxjs";
import earcut from "earcut";
import {Ship} from "Shared/game/objects";
import {Random} from "Shared/random";
import shipUrl from "../images/ship.png";
import gunUrl from "../images/gun.png";
import alienUrl from "../images/alien.png";
import asteroidUrl from "../images/asteroid.png";
const {Shape, VectorMaterial, SpriteMaterial} = builtIn;
const {Vector2D} = VectorMath;

const spriteLoader = new ImageLoader();

// preload sprites
const sprites = {};
const getSprite = (name, url) => spriteLoader.get(name, url).then((x) => sprites[name] = x);
getSprite("ship", shipUrl);
getSprite("gun", gunUrl);
getSprite("alien", alienUrl);
getSprite("asteroid", asteroidUrl);

function getAlphas(bitmap) {
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const context = canvas.getContext("2d");
	context.drawImage(bitmap, 0, 0);
	const data = context.getImageData(0, 0, bitmap.height, bitmap.width).data;

	const alphas = [];
	for (let x = 0; x < bitmap.width; x++) {
		alphas[x] = [];
		for (let y = 0; y < bitmap.height; y++) {
			alphas[x][y] = data[(y * bitmap.width + x) * 4 + 3] ? 1 : 0;
		}
	}

	return alphas;
}

const dirs = {
	left: {
		check: (arr, x, y) => arr[x - 1][y] && !arr[x - 1][y - 1],
		advance: (x, y) => [x - 1, y],
		getNext: (arr, x, y) => dirs.up.check(arr, x, y) ? dirs.up : dirs.down,
	},
	down: {
		check: (arr, x, y) => arr[x][y] && !arr[x - 1][y],
		advance: (x, y) => [x, y + 1],
		getNext: (arr, x, y) => dirs.left.check(arr, x, y) ? dirs.left : dirs.right,
	},
	right: {
		check: (arr, x, y) => arr[x][y - 1] && !arr[x][y],
		advance: (x, y) => [x + 1, y],
		getNext: (arr, x, y) => dirs.down.check(arr, x, y) ? dirs.down : dirs.up,
	},
	up: {
		check: (arr, x, y) => arr[x - 1][y - 1] && !arr[x][y - 1],
		advance: (x, y) => [x, y - 1],
		getNext: (arr, x, y) => dirs.right.check(arr, x, y) ? dirs.right : dirs.left,
	},
};

function getShape(bitmap, cx, cy, drawWidth, drawHeight) {
	const alphas = getAlphas(bitmap);

	// find left-most edge
	let x, y;
	for (x = 0; x < bitmap.width; x++) {
		for (y = 0; y < bitmap.height; y++) {
			if (alphas[x][y]) {
				break;
			}
		}
		if (alphas[x][y]) {
			break;
		}
	}

	const verts = [{x, y}];
	let dir = dirs.down;

	let count = 0;
	while (true) {
		while (dir.check(alphas, x, y)) {
			[x, y] = dir.advance(x, y);
		}

		if (x === verts[0].x && y === verts[0].y) {
			break;
		}

		verts.push({x, y});

		dir = dir.getNext(alphas, x, y);
		[x, y] = dir.advance(x, y);

		if (count++ === 1000) {
			// make sure we don't loop forever
			throw new Error("too many iterations");
		}
	}

	const width = drawWidth / bitmap.width;
	const height = drawHeight / bitmap.height;

	const tris = earcut(verts.flatMap((v) => [v.x, v.y]));
	const mVerts = verts.map((v) => new Vector2D((v.x - cx) * width, (cy - v.y) * height));
	const mCoords = verts.map((v) => new Vector2D(v.x / bitmap.width, v.y / bitmap.height));

	return {
		verts: tris.map((i) => mVerts[i]),
		tcoords: tris.map((i) => mCoords[i]),
	};
}

function singleton(create) {
	let func = (...args) => {
		const result = create(...args);
		func = () => result;
		return result;
	};

	return (...args) => func(...args);
}

const getExhaustComponents = singleton(() => ({
	exhaustVerts: [
		{x: 0, y: 0},
		{x: -.1, y: -.1},
		{x: 0, y: -1},
		{x: .1, y: -.1},
	],
	exhaustMaterial: new VectorMaterial([
		rgba(.1, .2, 1),
		rgba(.8, 0, .2),
		rgba(.8, .6, 0),
		rgba(.8, 0, .2),
	]),
}));
function makeExhaustRenderable(renderer, x, y, r) {
	const {exhaustVerts, exhaustMaterial} = getExhaustComponents();
	const exhaustShape = new Shape(exhaustVerts);
	const exhaust = renderer.getInstance(exhaustShape, exhaustMaterial);
	exhaust.x = x;
	exhaust.y = y;
	exhaust.r = r;

	exhaust.update = () => {
		const newVerts = exhaustVerts.map((v) => ({...v}));
		newVerts[2].x += Random.float(-.05, .05);
		newVerts[2].y += Random.float(-.05, .05);
		exhaustShape.update(newVerts);
	};

	return exhaust;
}

const getLazerComponents = singleton(() => ({
	lazerVerts: [
		{x: 0, y: 0},
		{x: .05, y: .1},
		{x: .05, y: 50},
		{x: 0, y: 50},
		{x: -.05, y: 50},
		{x: -.05, y: .1},
	],
	lazerMaterial: new VectorMaterial([
		rgba(1, 1, 1),
		rgba(.2, .6, 1),
		rgba(.2, .6, 1),
		rgba(1, 1, 1),
		rgba(.2, .6, 1),
		rgba(.2, .6, 1),
	]),
}));
function makeLazerRenderable(renderer, x, y, r) {
	const {lazerVerts, lazerMaterial} = getLazerComponents();
	const lazerShape = new Shape(lazerVerts);
	const lazer = renderer.getInstance(lazerShape, lazerMaterial);
	lazer.x = x;
	lazer.y = y;
	lazer.r = r;
	lazer.zIndex = 2;

	lazer.update = (lazerLength = 50) => {
		const newVerts = lazerVerts.map((v) => ({...v}));
		newVerts[2].y = lazerLength;
		newVerts[3].y = lazerLength;
		newVerts[4].y = lazerLength;
		lazerShape.update(newVerts);
	};

	return lazer;
}

const getGunComponents = singleton(() => {
	const {verts, tcoords} = getShape(sprites.gun, 8, 12, .5, .5);

	return {
		gunShape: new Shape(verts, Shape.triangles),
		gunMaterial: new SpriteMaterial(tcoords, sprites.gun, false),
	};
});
function makeGunRenderable(renderer, getCurrentShip, x, y, r) {
	const {gunShape, gunMaterial} = getGunComponents();
	const gun = renderer.getInstance(gunShape, gunMaterial);
	gun.x = x;
	gun.y = y;
	gun.r = r;
	gun.zIndex = 1;

	const {tip} = Ship.gunOffsets;
	const lazer = makeLazerRenderable(renderer, tip.x, tip.y, 0);

	gun.update = (ship, rotation, lazerLength) => {
		gun.r = rotation.radians - ship.r;
		lazer.update(lazerLength);
	};
	gun.getChildren = () => {
		const controls = getCurrentShip().controls;
		return controls.firingLazer && controls.gunPower !== 0 ? [lazer] : [];
	};

	return gun;
}

const getShipComponents = singleton(() => {
	const {verts, tcoords} = getShape(sprites.ship, 16, 16, 2, 2);

	return {
		shipShape: new Shape(verts, Shape.triangles),
		shipMaterial: new SpriteMaterial(tcoords, sprites.ship, false),
	};
});
export function makeShipRenderable(renderer, getCurrentShip) {
	const {shipShape, shipMaterial} = getShipComponents();
	const ship = renderer.getInstance(shipShape, shipMaterial);
	const exhausts = [
		makeExhaustRenderable(renderer, -.125, -1, 0),
		makeExhaustRenderable(renderer, +.125, -1, 0),
	];
	const {left, right} = Ship.gunOffsets;
	const guns = [
		makeGunRenderable(renderer, getCurrentShip, left.x, left.y, 0),
		makeGunRenderable(renderer, getCurrentShip, right.x, right.y, 0),
	];

	ship.update = (gunAimData, lazerCastResult = {}) => {
		for (const exhaust of exhausts) {
			exhaust.update();
		}

		guns[0].update(ship, gunAimData.leftRotation, lazerCastResult.leftLength);
		guns[1].update(ship, gunAimData.rightRotation, lazerCastResult.rightLength);
	};
	ship.getChildren = () => {
		return getCurrentShip().controls.forward ? exhausts.concat(guns) : guns;
	};

	return ship;
}

const getAlienComponents = singleton(() => {
	const {verts, tcoords} = getShape(sprites.alien, 16, 16, 2, 2);

	return {
		alienShape: new Shape(verts, Shape.triangles),
		alienMaterial: new SpriteMaterial(tcoords, sprites.alien, false),
	};
});
export function makeAlienRenderable(renderer) {
	const {alienShape, alienMaterial} = getAlienComponents();
	const alien = renderer.getInstance(alienShape, alienMaterial);
	return alien;
}

const getAsteroidComponents = singleton(() => {
	const {verts, tcoords} = getShape(sprites.asteroid, 16, 16, 2, 2);

	return {
		asteroidVerts: verts,
		asteroidMaterial: new SpriteMaterial(tcoords, sprites.asteroid, false),
	};
});
export function makeAsteroidRenderable(renderer, radius) {
	const {asteroidVerts, asteroidMaterial} = getAsteroidComponents();
	const mappedVerts = asteroidVerts.map((v) => v.times(radius));
	const asteroidShape = new Shape(mappedVerts);
	return renderer.getInstance(asteroidShape, asteroidMaterial);
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
