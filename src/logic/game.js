import {Renderer, Scene, rgba, builtIn, shaders} from "2d-gl";
import {fork, Math as VectorMath, Solver, AABB} from "boxjs";
import {physTime, physTimeMs} from "Shared/game/constants";
import {GameState} from "Shared/game/game-state";
import {flyShip} from "Shared/game/actions";
import {Ship, Asteroid, DebugBox} from "Shared/game/objects";
import {Action} from "Shared/serial";
import {SpaceBgShader} from "../logic/background-shader";
import {vLerp, aLerp} from "../logic/util";
import {makeShipRenderable, makeDebugBoxRenderable, makeAsteroidRenderable} from "./renderables";
const {OrthoCamera} = builtIn;
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
	}
	getVisibleFunc({x0, y0, x1, y1}) {
		const visible = new Set();

		const gameState = this.getGameState();
		gameState.solver.query(new AABB(x0, y0, x1, y1), (shape) => {
			const renderable = this.renderables[shape.body.id];
			visible.add(renderable);
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

		// update ship
		if (gameState.ship.body) {
			const ship = this.renderables[gameState.ship.body.id];
			ship.update();
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
		Object.assign(gameState.ship.controls, this.latestSync.ship.controls);
		if (this.idMap[this.latestSync.ship.body.id] == null) {
			const body = Ship.createBody(this.latestSync.ship.body);
			const renderable = makeShipRenderable(this.renderer, () => this.getGameState().ship);
			this.addBody(gameState, this.latestSync.ship.body.id, body, renderable);
			gameState.ship.body = body;
		} else {
			updates.push(this.latestSync.ship.body);
		}

		for (const asteroid of this.latestSync.asteroids) {
			if (this.idMap[asteroid.body.id] == null) {
				const body = Asteroid.createBody(asteroid.body, asteroid.radius);
				const renderable = makeAsteroidRenderable(this.renderer, asteroid.radius);
				this.addBody(gameState, asteroid.body.id, body, renderable);
			} else {
				updates.push(asteroid.body);
			}
		}

		for (const debugBox of this.latestSync.debugBoxes) {
			if (debugBox.clientId === this.userId) {
				this.ackDebugAction(debugBox);
			}

			if (this.idMap[debugBox.body.id] == null) {
				const body = DebugBox.createBody(debugBox.body);
				const renderable = makeDebugBoxRenderable(this.renderer);
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
			// since we're skipping ahead, the framebuffer is now invalid.
			// just fill the buffer with our latest frame and let sync catch us up.
			this.frameBuffer.fill(this.frameBuffer[0]);
			this.actionBuffer.fill([]);
		}

		// adjust framezero if we're recieving syncs from the future
		if (this.latestSync && this.latestSync.frameId > this.frameId) {
			this.frameZero -= (this.latestSync.frameId - this.frameId) * physTimeMs;
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
				if (action.type === Action.flightControls) {
					Object.assign(gameState.ship.controls, action);
				} else if (action.type === Action.gunControls) {
					gameState.ship.controls.aim.set(action);
				} else if (action.type === Action.debug) {
					if (gameState.solver.bodyMap[action.body.id] == null) {
						gameState.solver.addBody(fork.cloneBody(action.body));
					}
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
