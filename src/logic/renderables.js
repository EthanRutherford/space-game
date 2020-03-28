import {ImageLoader, rgba, builtIn} from "2d-gl";
import {Math as VectorMath} from "boxjs";
import earcut from "earcut";
import shipUrl from "../images/ship.png";
import gunUrl from "../images/gun.png";
const {Shape, VectorMaterial, SpriteMaterial} = builtIn;
const {Vector2D} = VectorMath;

const spriteLoader = new ImageLoader();

// preload sprites
const sprites = {};
const getSprite = (name, url) => spriteLoader.get(name, url).then((x) => sprites[name] = x);
getSprite("ship", shipUrl);
getSprite("gun", gunUrl);

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
	const mVerts = verts.map((v) => ({x: (v.x - cx) * width, y: (cy - v.y) * height}));
	const mCoords = verts.map((v) => ({x: v.x / bitmap.width, y: v.y / bitmap.height}));

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

const getExhaustMaterial = singleton(() => new VectorMaterial([
	rgba(.1, .2, 1),
	rgba(.8, 0, .2),
	rgba(.8, .6, 0),
	rgba(.8, 0, .2),
]));
function makeExhaustRenderable(renderer, x, y, r) {
	const verts = [
		{x: 0, y: 0},
		{x: -.1, y: -.1},
		{x: 0, y: -1},
		{x: .1, y: -.1},
	];

	const exhaustShape = new Shape(verts);
	const exhaustMaterial = getExhaustMaterial();
	const exhaust = renderer.getInstance(exhaustShape, exhaustMaterial);
	exhaust.x = x;
	exhaust.y = y;
	exhaust.r = r;

	exhaust.update = () => {
		const newVerts = verts.map((v) => ({...v}));
		newVerts[2].x += (Math.floor(Math.random() * 3) - 1) * .02;
		newVerts[2].y += (Math.floor(Math.random() * 3) - 1) * .02;
		exhaustShape.update(newVerts);
	};

	return exhaust;
}

const getGunComponents = singleton(() => {
	const {verts, tcoords} = getShape(sprites.gun, 8, 12, .5, .5);

	return {
		gunShape: new Shape(verts, Shape.triangles),
		gunMaterial: new SpriteMaterial(tcoords, sprites.gun, false),
	};
});
function makeGunRenderable(renderer, x, y, r) {
	const {gunShape, gunMaterial} = getGunComponents();
	const gun = renderer.getInstance(gunShape, gunMaterial);
	gun.x = x;
	gun.y = y;
	gun.r = r;

	gun.update = (ship, offset, aim) => {
		const c = Math.cos(-ship.r);
		const s = Math.sin(-ship.r);
		const vector = new Vector2D(
			c * aim.x - s * aim.y,
			s * aim.x + c * aim.y,
		).add(offset).sub(gun);
		gun.r = Math.atan2(-vector.x, vector.y);
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
	const guns = [
		makeGunRenderable(renderer, -.5, -.5, 0),
		makeGunRenderable(renderer, +.5, -.5, 0),
	];

	ship.update = () => {
		const currentShip = getCurrentShip();
		for (const exhaust of exhausts) {
			exhaust.update();
		}
		for (const gun of guns) {
			const offset = currentShip.body.mass.center;
			gun.update(ship, offset, currentShip.controls.aim);
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
