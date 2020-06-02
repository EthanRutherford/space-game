import {unstable_batchedUpdates as batchedUpdates} from "react-dom";
import {Renderer, Scene, rgba, builtIn, shaders} from "2d-gl";
import {Math as VectorMath, AABB} from "boxjs";
import {physTimeMs} from "Shared/game/constants";
import {GameCore} from "Shared/game/game-core";
import {DebugBox} from "Shared/game/objects";
import {Action} from "Shared/serial";
import {SpaceBgShader} from "../logic/background-shader";
import {vLerp, aLerp} from "../logic/util";
import {
	makeShipRenderable,
	makeAlienRenderable,
	makeAsteroidRenderable,
	makeDebugBoxRenderable,
} from "./renderables";
const {OrthoCamera} = builtIn;
const {MotionBlur} = shaders;
const {cleanAngle} = VectorMath;

export class Game {
	constructor(canvas, userId) {
		this.userId = userId;
		this.postSolveHandlers = new Set();

		// initialize core game logic
		this.gameCore = new GameCore();

		// create renderer and related data
		this.renderer = new Renderer(canvas);
		this.scene = new Scene({bgColor: rgba(.1, .1, .1, 1)});
		this.camera = new OrthoCamera(0, 0, 20);
		this.scene.getVisibleFunc = this.getVisibleFunc.bind(this);

		// add shaders
		this.blurShader = this.renderer.createShader(MotionBlur);
		this.scene.addPostProcShader(this.blurShader);
		const bgShader = this.renderer.createShader(SpaceBgShader);
		this.scene.setBackgroundShader(bgShader);

		// track updates from the server
		this.idMap = {};
		this.errorMap = {};
		this.renderables = {};
		this.latestSync = null;

		// initialize ship
		const renderable = makeShipRenderable(this.renderer, () => this.getGameState().ship);
		this.scene.add(renderable);
		this.idMap[0] = 0;
		this.errorMap[0] = {x: 0, y: 0, r: 0};
		this.renderables[0] = renderable;

		// start render and step loops
		this.tryApplyUpdate = this.tryApplyUpdate.bind(this);
		this.animLoop = this.animLoop.bind(this);
		this.stepLoop = this.stepLoop.bind(this);
		this.frameId = 0;
		this.frameZero = 0;
		requestAnimationFrame(this.animLoop);
		this.stepLoop();
	}
	getVisibleFunc({x0, y0, x1, y1}) {
		const visible = new Set();

		const gameState = this.getGameState();
		gameState.solver.query(new AABB(x0, y0, x1, y1), (shape) => {
			const renderable = this.renderables[shape.body.id];
			if (renderable != null) {
				visible.add(renderable);
			}
		});

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
		const errors = this.errorMap[gameState.ship.body.id];
		const prevPos = gameState.ship.body.prevPos.minus(errors);
		const currentPos = gameState.ship.body.position.minus({
			x: errors.x * .85,
			y: errors.y * .85,
		});

		const pos = vLerp(prevPos, currentPos, ratio);
		this.camera.x += (pos.x - this.camera.x) * .99;
		this.camera.y += (pos.y - this.camera.y) * .99;

		// update renderable positions and error deltas
		for (const body of gameState.solver.bodies) {
			const renderable = this.renderables[body.id];
			if (renderable == null) {
				continue;
			}

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
			renderable.x = pos.x;
			renderable.y = pos.y;
			renderable.r = angle;
		}

		// update ship
		const ship = this.renderables[gameState.ship.body.id];
		ship.update(this.gameCore.gunAimData, this.gameCore.lazerCastResult);

		// render scene
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
		Object.assign(gameState.ship.controls, this.latestSync.ship.controls);
		updates.push(this.latestSync.ship.body);

		for (const [id, alien] of Object.entries(this.latestSync.aliens)) {
			if (this.idMap[id] == null) {
				const ali = gameState.addAlien(alien.body, alien.hp);
				const renderable = makeAlienRenderable(this.renderer);
				this.addBody(gameState, alien.body.id, ali.body, renderable);
			} else {
				// TODO: sync brain
				gameState.aliens[this.idMap[id]].hp = alien.hp;
				updates.push(alien.body);
			}
		}

		for (const [id, asteroid] of Object.entries(this.latestSync.asteroids)) {
			if (this.idMap[id] == null) {
				const ast = gameState.addAsteroid(asteroid.body, asteroid.radius);
				const renderable = makeAsteroidRenderable(this.renderer, asteroid.radius);
				this.addBody(gameState, asteroid.body.id, ast.body, renderable);
			} else {
				updates.push(asteroid.body);
			}
		}

		for (const [id, debugBox] of Object.entries(this.latestSync.debugBoxes)) {
			if (debugBox.clientId === this.userId) {
				this.ackDebugAction(debugBox);
			}

			if (this.idMap[id] == null) {
				const box = gameState.addDebugBox(debugBox.body);
				const renderable = makeDebugBoxRenderable(this.renderer);
				this.addBody(gameState, debugBox.body.id, box.body, renderable);
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
			// since we're skipping ahead, the framebuffer is now invalid.
			// just fill the buffer with our latest frame and let sync catch us up.
			this.gameCore.frameBuffer.fill(this.gameCore.frameBuffer[0]);
			this.gameCore.actionBuffer.fill([]);
		}

		// adjust framezero if we're recieving syncs from the future
		if (this.latestSync && this.latestSync.frameId > this.frameId) {
			this.frameZero -= (this.latestSync.frameId - this.frameId) * physTimeMs;
			this.frameId = this.latestSync.frameId;
		}

		// prepare to replay time
		const frameId = this.latestSync &&
			this.frameId - this.latestSync.frameId < this.gameCore.length ?
			this.latestSync.frameId :
			this.frameId;

		// step forward and apply sync
		const expiredActions = this.gameCore.doStep(frameId, this.frameId, this.tryApplyUpdate);

		// delete bodies and data from expired actions
		for (const expiredAction of expiredActions || []) {
			if (expiredAction.type === Action.debug) {
				if (!expiredAction.acked) {
					for (const gameState of this.gameCore.frameBuffer) {
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
		this.frameId++;

		// post solve
		batchedUpdates(() => {
			for (const handler of this.postSolveHandlers) {
				handler(this.frameId);
			}
		});
	}
	updateGameTime(time, timeStamp) {
		// the server sends the current server game time, already
		// offset by the transmission time.
		// We use this to sync up local game time with the server.
		this.frameZero = timeStamp - time;
	}
	updateSync(sync) {
		this.latestSync = sync;
	}
	addAction(action) {
		if (action.type === Action.debug) {
			action.body = DebugBox.createBody(action);
			action.renderable = makeDebugBoxRenderable(this.renderer);
			this.scene.add(action.renderable);

			this.errorMap[action.body.id] = {x: 0, y: 0, r: 0};
			this.renderables[action.body.id] = action.renderable;
		}

		this.gameCore.actionBuffer[0].push(action);
	}
	ackDebugAction(debugBox) {
		if (
			debugBox.frameId <= this.frameId &&
			debugBox.frameId > this.frameId - this.gameCore.length
		) {
			const index = this.frameId - debugBox.frameId;
			const action = this.gameCore.actionBuffer[index].find(
				(a) => a.type === Action.debug,
			);
			action.acked = true;
			this.idMap[debugBox.body.id] = action.body.id;
		}
	}
	getGameState() {
		return this.gameCore.getGameState();
	}
	addPostSolveHandler(handler) {
		this.postSolveHandlers.add(handler);
	}
	removePostSolveHandler(handler) {
		this.postSolveHandlers.delete(handler);
	}
}
