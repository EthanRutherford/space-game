const {
	Renderer,
	Scene,
	rgba,
	builtIn: {
		Shape,
		OrthoCamera,
		VectorMaterial,
	},
	shaders: {
		MotionBlur,
	},
} = require("2d-gl");
const {
	fork,
	Math: {cleanAngle},
	Solver,
	Body,
	AABB,
	Shapes: {Polygon},
} = require("boxjs");
const {physTime, physTimeMs} = require("../../shared/game/constants");
const {GameState} = require("../../shared/game/game-state");
const {createBox} = require("../../shared/game/actions");
const Ship = require("../../shared/game/ship");
const {Action} = require("../../shared/serial");
const BgShader = require("../logic/background-shader");
const {vLerp, aLerp} = require("../logic/util");

module.exports = class Game {
	constructor(canvas) {
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
		const bgShader = this.renderer.createShader(BgShader);
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

		this.getGameState().solver.query(new AABB(x0, y0, x1, y1), (shape) => {
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

		// update renderable positions and error deltas
		const gameState = this.getGameState();
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

		if (gameState.ship.bodyId != null) {
			const shipId = this.idMap[gameState.ship.bodyId];
			const renderable = this.renderables[shipId];
			this.camera.x += (renderable.x - this.camera.x) * .99;
			this.camera.y += (renderable.y - this.camera.y) * .99;
		}

		this.renderer.render(this.camera, this.scene);
	}
	tryApplyUpdate(frameId, gameState) {
		if (
			this.latestSync == null ||
			this.latestSync.frameId !== frameId
		) {
			return;
		}

		gameState.ship.bodyId = this.latestSync.ship.bodyId;
		gameState.ship.hp = this.latestSync.ship.hp;

		for (const update of this.latestSync.bodies) {
			if (
				this.idMap[update.id] == null ||
				gameState.solver.bodyMap[this.idMap[update.id]] == null
			) {
				const body = new Body({
					position: update.position,
					angle: update.radians,
					velocity: update.velocity,
					angularVelocity: update.angularVelocity,
					shapes: [new Polygon().setAsBox(.5, .5)],
				});

				const shape = new Shape(
					body.shapes[0].originalPoints,
				);
				const blue = rgba(0, 0, 1, 1);
				const material = new VectorMaterial(
					[blue, blue, blue, blue],
					VectorMaterial.triangleFan,
				);

				const renderable = this.renderer.getInstance(shape, material);

				gameState.solver.addBody(body);
				this.scene.add(renderable);

				this.idMap[update.id] = body.id;
				this.errorMap[body.id] = {x: 0, y: 0, r: 0};
				this.renderables[body.id] = renderable;
			} else {
				const id = this.idMap[update.id];
				const body = gameState.solver.bodyMap[id];
				const errors = this.errorMap[id];

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
				if (gameState.solver.bodyMap[action.body.id] == null) {
					gameState.solver.addBody(fork.cloneBody(action.body));
				}
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

		// update frameId
		this.frameId = frameId;
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
	tryAddAction(action) {
		if (action.type === Action.debug) {
			action.body = createBox(action);

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
			this.actionBuffer[0].push(action);

			return true;
		}

		return false;
	}
	ackAction(ack) {
		if (
			ack.frameId <= this.frameId &&
			ack.frameId > this.frameId - this.frameBuffer.length
		) {
			const index = this.frameId - ack.frameId;
			const action = this.actionBuffer[index].find((a) => a.type === Action.debug);
			action.acked = true;
			this.idMap[ack.bodyId] = action.body.id;
		}
	}
	getGameState() {
		return this.frameBuffer[0];
	}
};
