import {Renderer, Scene, rgba, builtIn, shaders} from "2d-gl";
import {fork, Math as VectorMath, Solver, AABB} from "boxjs";
import {physTime, physTimeMs} from "Shared/game/constants";
import {GameState} from "Shared/game/game-state";
import {flyShip} from "Shared/game/actions";
import {Ship, DebugBox} from "Shared/game/objects";
import {Action} from "Shared/serial";
import {SpaceBgShader} from "../logic/background-shader";
import {vLerp, aLerp} from "../logic/util";
import {spriteLoader} from "./sprites";
const {Shape, OrthoCamera, VectorMaterial, SpriteMaterial} = builtIn;
const {MotionBlur} = shaders;
const {cleanAngle} = VectorMath;

export class Game {
	constructor(canvas, userId) {
		this.userId = userId;

		const solver = new Solver();
		const ship = new Ship(null);

		const frame0 = new GameState(solver, ship);
		this.frameBuffer = [frame0, null, null, null, null];
		this.actionBuffer = [[], null, null, null, null];

		// create renderer and related data
		this.renderer = new Renderer(canvas);
		this.scene = new Scene({bgColor: rgba(.1, .1, .1, 1)});
		this.camera = new OrthoCamera(0, 0, 20);
		this.scene.getVisibleFunc = this.getVisibleFunc.bind(this);

		// add shaders
		const blurShader = this.renderer.createShader(MotionBlur);
		const bgShader = this.renderer.createShader(SpaceBgShader);
		this.scene.addPostProcShader(blurShader);
		this.scene.setBackgroundShader(bgShader);

		// start render and step loops
		this.animLoop = this.animLoop.bind(this);
		this.stepLoop = this.stepLoop.bind(this);
		this.frameId = 0;
		this.frameZero = 0;
		requestAnimationFrame(this.animLoop);
		this.stepLoop();

		// track updates from the server
		this.idMap = {};
		this.errorMap = {};
		this.renderables = {};
		this.latestSync = null;

		// sprites and other stuff
		spriteLoader.get("ship").then((ship) => this.shipPng = ship);
		this.baseFireVerts = [
			{x: 0, y: 0},
			{x: -.05, y: -.05},
			{x: 0, y: -.5},
			{x: .05, y: -.05},
		];
		this.fireShape1 = new Shape(
			this.baseFireVerts.map((v) => ({x: v.x - .0625, y: v.y - .5})),
		);
		this.fireShape2 = new Shape(
			this.baseFireVerts.map((v) => ({x: v.x + .0625, y: v.y - .5})),
		);
		const fireMaterial = new VectorMaterial([
			rgba(.1, .2, 1, 1),
			rgba(.8, 0, .2, 1),
			rgba(.8, .6, 0, 1),
			rgba(.8, 0, .2, 1),
		]);
		this.fire1 = this.renderer.getInstance(this.fireShape1, fireMaterial);
		this.fire2 = this.renderer.getInstance(this.fireShape2, fireMaterial);
	}
	getVisibleFunc({x0, y0, x1, y1}) {
		const visible = new Set();

		const gameState = this.getGameState();
		gameState.solver.query(new AABB(x0, y0, x1, y1), (shape) => {
			const renderable = this.renderables[shape.body.id];
			visible.add(renderable);
		});

		if (gameState.ship.controls.forward) {
			visible.add(this.fire1);
			visible.add(this.fire2);
		}

		return [...visible];
	}
	render(ratio) {
		// There are two "smoothing" functions performed during render.
		// The first kind is error offset smoothing. When a body drifts
		// from the server position, the physics state is snapped to the
		// correct value, but the error offset is stored. We use that
		// error offset to adjust the rendered position, and quickly
		// drive that error offset back down to zero over time, so that
		// the error is visually corrected smoothly.
		// the second kind smooths over the differences in physics fps
		// and rendering fps. We lerp between current position and
		// previous position by a ratio corresponding to what fraction
		// of the current physics step in time we are.
		// (essentially rendering one physics step behind real time)

		// update camera position
		const gameState = this.getGameState();
		if (gameState.ship.body != null) {
			const errors = this.errorMap[gameState.ship.body.id];
			const prevPos = gameState.ship.body.prevPos.minus(errors);
			const currentPos = gameState.ship.body.position.minus({
				x: errors.x * .85,
				y: errors.y * .85,
			});

			const pos = vLerp(prevPos, currentPos, ratio);
			this.camera.x += (pos.x - this.camera.x) * .99;
			this.camera.y += (pos.y - this.camera.y) * .99;
		}

		// update renderable positions and error deltas
		for (const body of gameState.solver.bodies) {
			const errors = this.errorMap[body.id];
			const prevPos = body.originalPrevPos.minus(errors);
			const prevAngle = body.prevTrans.radians - errors.r;

			errors.x *= .85;
			errors.y *= .85;
			errors.r *= .85;

			const currentPos = body.originalPosition.minus(errors);
			const currentAngle = body.transform.radians - errors.r;

			const pos = vLerp(prevPos, currentPos, ratio);
			const angle = aLerp(prevAngle, currentAngle, ratio);
			const renderable = this.renderables[body.id];
			if (renderable) {
				renderable.x = pos.x;
				renderable.y = pos.y;
				renderable.r = angle;
			}
		}

		// update fire positions
		if (gameState.ship.controls.forward) {
			const ship = this.renderables[gameState.ship.body.id];
			this.fire1.x = ship.x;
			this.fire1.y = ship.y;
			this.fire1.r = ship.r;
			this.fire2.x = ship.x;
			this.fire2.y = ship.y;
			this.fire2.r = ship.r;

			// add some fun randomness
			const verts1 = this.baseFireVerts.map((v) => ({x: v.x - .0625, y: v.y - .5}));
			const verts2 = this.baseFireVerts.map((v) => ({x: v.x + .0625, y: v.y - .5}));

			verts1[2].x += (Math.floor(Math.random() * 3) - 1) * .01;
			verts2[2].x += (Math.floor(Math.random() * 3) - 1) * .01;

			this.fireShape1.update(verts1);
			this.fireShape2.update(verts2);
		}

		this.renderer.render(this.camera, this.scene);
	}
	addBody(gameState, serverId, body, renderable) {
		gameState.solver.addBody(body);
		this.scene.add(renderable);
		this.idMap[serverId] = body.id;
		this.errorMap[body.id] = {x: 0, y: 0, r: 0};
		this.renderables[body.id] = renderable;
	}
	tryApplyUpdate(frameId, gameState) {
		if (
			this.latestSync == null ||
			this.latestSync.frameId !== frameId
		) {
			return;
		}

		const updates = [];

		gameState.ship.hp = this.latestSync.ship.hp;
		gameState.ship.controls = this.latestSync.ship.controls;
		if (this.idMap[this.latestSync.ship.body.id] == null) {
			const body = Ship.createBody(this.latestSync.ship.body);
			const shipShape = new Shape(
				[{x: -.5, y: -.5}, {x: .5, y: -.5}, {x: .5, y: .5}, {x: -.5, y: .5}],
			);
			// origin (0, 0) in an image is topleft
			const shipMaterial = new SpriteMaterial(
				[{x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}],
				this.shipPng,
				false,
			);

			const renderable = this.renderer.getInstance(shipShape, shipMaterial);
			this.addBody(gameState, this.latestSync.ship.body.id, body, renderable);
			gameState.ship.body = body;
		} else {
			updates.push(this.latestSync.ship.body);
		}

		for (const debugBox of this.latestSync.debugBoxes) {
			if (debugBox.clientId === this.userId) {
				this.ackDebugAction(debugBox);
			}

			if (this.idMap[debugBox.body.id] == null) {
				const body = DebugBox.createBody(debugBox.body);

				const shape = new Shape(
					body.shapes[0].originalPoints,
				);
				const blue = rgba(0, 0, 1, 1);
				const material = new VectorMaterial(
					[blue, blue, blue, blue],
					VectorMaterial.triangleFan,
				);

				const renderable = this.renderer.getInstance(shape, material);
				this.addBody(gameState, debugBox.body.id, body, renderable);
			} else {
				updates.push(debugBox.body);
			}
		}

		for (const update of updates) {
			const id = this.idMap[update.id];
			const body = gameState.solver.bodyMap[id];
			const errors = this.errorMap[body.id];

			if (
				Math.abs(update.position.x - body.position.x) < .0001 &&
				Math.abs(update.position.y - body.position.y) < .0001 &&
				Math.abs(update.radians - body.transform.radians) < .0001
			) {
				continue;
			}

			// update error offsets
			const curX = body.position.x - errors.x;
			const curY = body.position.y - errors.y;
			const curR = body.transform.radians - errors.r;
			errors.x = update.position.x - curX;
			errors.y = update.position.y - curY;
			errors.r = cleanAngle(update.radians - curR);

			// snap physics state to synced position
			body.position.set(update.position);
			body.transform.radians = update.radians;
			body.velocity.set(update.velocity);
			body.angularVelocity = update.angularVelocity;

			// wake body
			body.setAsleep(false);
		}

		this.latestSync = null;
	}
	animLoop() {
		requestAnimationFrame(this.animLoop);
		const curTime = performance.now() - this.frameZero;
		const lastFrameTime = (this.frameId - 1) * physTimeMs;
		const subFrameTime = curTime - lastFrameTime;

		this.render(subFrameTime / physTimeMs);
	}
	stepLoop() {
		// compensate for drift by scheduling using when
		// the next frame *should* be
		const now = performance.now();
		const currentFrameId = Math.round((now - this.frameZero) / physTimeMs);
		const nextFrameTime = this.frameZero + ((currentFrameId + 1) * physTimeMs);
		setTimeout(this.stepLoop, nextFrameTime - now);

		// just skip ahead if we've fallen behind
		if (currentFrameId !== this.frameId) {
			this.frameId = currentFrameId;
		}

		// adjust framezero if we're recieving syncs from the future
		if (this.latestSync && this.latestSync.frameId > this.frameId) {
			this.frameZero -= this.latestSync.frameId - this.frameId * physTimeMs;
			this.frameId = this.latestSync.frameId;
		}

		// prepare to replay time
		let frameId = this.latestSync &&
			this.frameId - this.latestSync.frameId < this.frameBuffer.length ?
			this.latestSync.frameId :
			this.frameId;
		const gameState = this.frameBuffer[this.frameId - frameId];

		// step forward and apply sync
		while (frameId <= this.frameId) {
			const index = this.frameId - frameId;

			for (const action of this.actionBuffer[index]) {
				if (action.type === Action.debug) {
					if (gameState.solver.bodyMap[action.body.id] == null) {
						gameState.solver.addBody(fork.cloneBody(action.body));
					}
				} else if (action.type === Action.flightControls) {
					gameState.ship.controls = action;
				}
			}

			if (gameState.ship.body) {
				flyShip(gameState.ship.body, gameState.ship.controls);
			}

			this.frameBuffer[index] = gameState.fork();
			gameState.solver.solve(physTime);
			this.tryApplyUpdate(frameId, gameState);
			frameId++;
		}

		// add current frame to buffer
		this.frameBuffer.unshift(gameState);
		this.frameBuffer.pop();
		this.actionBuffer.unshift([]);
		const expiredActions = this.actionBuffer.pop();

		// delete bodies and data from expired actions
		for (const expiredAction of expiredActions || []) {
			if (expiredAction.type === Action.debug) {
				if (!expiredAction.acked) {
					for (const gameState of this.frameBuffer) {
						const body = gameState.solver.bodyMap[expiredAction.body.id];
						if (body) {
							gameState.solver.removeBody(body);
						}
					}

					delete this.errorMap[expiredAction.body.id];
					delete this.renderables[expiredAction.body.id];
					this.scene.delete(expiredAction.renderable);
				}
			}
		}

		// update frameId
		this.frameId = frameId;

		// post solve
		if (this.postSolve) {
			this.postSolve(this.frameId);
		}
	}
	updateGameTime(time) {
		// the server sends the current server game time, already
		// offset by the transmission time.
		// We use this to sync up local game time with the server.
		this.frameZero = performance.now() - time;
		this.frameId = Math.floor(time / physTimeMs) + 1;
	}
	updateSync(sync) {
		this.latestSync = sync;
	}
	addAction(action) {
		if (action.type === Action.debug) {
			action.body = DebugBox.createBody(action);

			const shape = new Shape(
				action.body.shapes[0].originalPoints,
			);
			const blue = rgba(0, 0, 1, 1);
			const material = new VectorMaterial(
				[blue, blue, blue, blue],
				VectorMaterial.triangleFan,
			);

			action.renderable = this.renderer.getInstance(shape, material);
			this.scene.add(action.renderable);

			this.errorMap[action.body.id] = {x: 0, y: 0, r: 0};
			this.renderables[action.body.id] = action.renderable;
		}

		this.actionBuffer[0].push(action);
	}
	ackDebugAction(debugBox) {
		if (
			debugBox.frameId <= this.frameId &&
			debugBox.frameId > this.frameId - this.frameBuffer.length
		) {
			const index = this.frameId - debugBox.frameId;
			const action = this.actionBuffer[index].find((a) => a.type === Action.debug);
			action.acked = true;
			this.idMap[debugBox.body.id] = action.body.id;
		}
	}
	getGameState() {
		return this.frameBuffer[0];
	}
}
