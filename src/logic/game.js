const {
	Renderer,
	Scene,
	rgba,
	builtIn: {
		Shape,
		OrthoCamera,
		VectorMaterial,
	},
} = require("2d-gl");
const {
	fork,
	Math: {Vector2D, cleanAngle},
	Solver,
	Body,
	AABB,
	Shapes: {Polygon},
} = require("boxjs");
const {physTime, physTimeMs} = require("../../shared/game/constants");
const {createBox} = require("../../shared/game/actions");
const {vLerp, aLerp} = require("../logic/util");

module.exports = class Game {
	constructor(canvas) {
		this.frameBuffer = [new Solver(), null, null, null];
		this.actionBuffer = [null, null, null, null, null];

		// create renderer and related data
		this.renderer = new Renderer(canvas);
		this.scene = new Scene({bgColor: rgba(.1, .1, .1, 1)});
		this.camera = new OrthoCamera(0, 0, 20);
		this.scene.getVisibleFunc = this.getVisibleFunc.bind(this);

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

		this.getSolver().query(new AABB(x0, y0, x1, y1), (shape) => {
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
		for (const body of this.getSolver().bodies) {
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

		this.renderer.render(this.camera, this.scene);
	}
	tryApplyUpdate(frameId, solver) {
		if (
			this.latestSync == null ||
			this.latestSync.frameId !== frameId
		) {
			return;
		}

		for (const update of this.latestSync.updates) {
			if (this.idMap[update.id] == null) {
				const body = new Body({
					position: new Vector2D(update.x, update.y),
					angle: update.r,
					velocity: new Vector2D(update.dx, update.dy),
					angularVelocity: update.dr,
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

				solver.addBody(body);
				this.scene.add(renderable);

				this.idMap[update.id] = body.id;
				this.errorMap[body.id] = {x: 0, y: 0, r: 0};
				this.renderables[body.id] = renderable;
			} else {
				const id = this.idMap[update.id];
				const body = solver.bodyMap[id];
				const errors = this.errorMap[id];

				if (
					Math.abs(update.x - body.position.x) < .0001 &&
					Math.abs(update.y - body.position.y) < .0001 &&
					Math.abs(update.r - body.transform.radians) < .0001
				) {
					continue;
				}

				// update error offsets
				const curX = body.position.x - errors.x;
				const curY = body.position.y - errors.y;
				const curR = body.transform.radians - errors.r;
				errors.x = update.x - curX;
				errors.y = update.y - curY;
				errors.r = cleanAngle(update.r - curR);

				// snap physics state to synced position
				body.position.x = update.x;
				body.position.y = update.y;
				body.transform.radians = update.r;
				body.velocity.x = update.dx;
				body.velocity.y = update.dy;
				body.angularVelocity = update.dr;

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
		const nextFrameId = Math.round((now - this.frameZero) / physTimeMs) + 1;
		const nextFrameTime = this.frameZero + (nextFrameId * physTimeMs);
		setTimeout(this.stepLoop, nextFrameTime - now);

		// just skip ahead if we've fallen behind
		if (nextFrameId - this.frameId > 1) {
			this.frameId = nextFrameId - 1;
		}

		// prepare to replay time
		let frameId = this.latestSync &&
			this.frameId - this.latestSync.frameId >= this.frameBuffer.length ?
			this.latestSync.frameId :
			this.frameId;
		const solver = this.frameBuffer[this.frameId - frameId];

		// step forward and apply sync
		while (frameId < nextFrameId) {
			const index = this.frameId - frameId;

			const action = this.actionBuffer[index];
			if (action != null && solver.bodyMap[action.body.id] == null) {
				solver.addBody(fork.cloneBody(action.body));
			}

			this.frameBuffer[index] = fork(solver);
			solver.solve(physTime);
			this.tryApplyUpdate(frameId, solver);
			frameId++;
		}

		// add current frame to buffer
		this.frameBuffer.unshift(solver);
		this.frameBuffer.pop();
		this.actionBuffer.unshift(null);
		const expiredAction = this.actionBuffer.pop();

		// delete bodies and data from expired actions
		if (expiredAction != null && !expiredAction.acked) {
			for (const solver of this.frameBuffer) {
				const body = solver.bodyMap[expiredAction.body.id];
				if (body) {
					solver.removeBody(body);
				}
			}

			delete this.errorMap[expiredAction.body.id];
			delete this.renderables[expiredAction.body.id];
			this.scene.delete(expiredAction.renderable);
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
		const now = performance.now();
		const nextFrameId = Math.floor((now - this.frameZero) / physTimeMs) + 1;
		if (
			sync.frameId <= nextFrameId &&
			sync.frameId > nextFrameId - this.frameBuffer.length
		) {
			this.latestSync = sync;
		}
	}
	tryAddAction(action) {
		if (this.actionBuffer[0] == null) {
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
			this.actionBuffer[0] = action;

			return true;
		}

		return false;
	}
	ackAction(action) {
		if (
			action.frameId <= this.frameId &&
			action.frameId > this.frameId - this.frameBuffer.length
		) {
			const index = this.frameId - action.frameId;
			this.actionBuffer[index].acked = true;
			this.idMap[action.bodyId] = this.actionBuffer[index].body.id;
		}
	}
	getSolver() {
		return this.frameBuffer[0];
	}
};
