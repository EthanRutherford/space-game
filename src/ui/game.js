import {useRef, useMemo, useEffect} from "react";
import j from "react-jenny";
import {Math as VectorMath} from "boxjs";
import {roleIds} from "Shared/game/roles";
import {Timing, Action, Sync} from "Shared/serial";
import {Game} from "../logic/game";
const {Vector2D} = VectorMath;

export function GameUi(props) {
	const canvas = useRef();
	const game = useRef();
	const controls = useMemo(() => ({aim: {x: 0, y: 2}, changed: false}), []);
	useEffect(function() {
		// create game
		game.current = new Game(canvas.current, props.userId);
		game.current.postSolve = postSolve;

		// listen for updates
		props.channel.addListener((message) => {
			if (message.type === Timing) {
				game.current.updateGameTime(message.data.time);
			} else if (message.type === Sync) {
				game.current.updateSync(message.data);
			}
		});

		// add global listeners
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		window.addEventListener("mousemove", mouseMove);
	}, []);

	function postSolve(frameId) {
		if (controls.changed) {
			if (props.role === roleIds.pilot) {
				const action = {
					type: Action.flightControls,
					frameId,
					...controls,
				};

				game.current.addAction(action);
				props.channel.sendAction(action);
			} else if (props.role === roleIds.gunner) {
				if (controls.aimDirty) {
					controls.aim = Vector2D.clone(game.current.renderer.viewportToWorld(
						controls.clientAim.x,
						controls.clientAim.y,
						game.current.camera,
					)).sub(game.current.camera);

					controls.aimDirty = false;
				}

				const action = {
					type: Action.gunControls,
					frameId,
					aim: controls.aim,
					firingLazer: controls.firingLazer,
				};

				game.current.addAction(action);
				props.channel.sendAction(action);
			}
			controls.changed = false;
		}
	}

	function wheel(event) {
		game.current.camera.zoom = Math.max(
			game.current.camera.zoom + event.deltaY / 100, 1,
		);

		if (props.role === roleIds.gunner) {
			controls.aimDirty = true;
			controls.changed = true;
		}
	}

	function keyDown(event) {
		if (props.role === roleIds.pilot) {
			if (event.key === "w") {
				controls.forward = true;
				controls.changed = true;
			} else if (event.key === "a") {
				controls.left = true;
				controls.changed = true;
			} else if (event.key === "s") {
				controls.backward = true;
				controls.changed = true;
			} else if (event.key === "d") {
				controls.right = true;
				controls.changed = true;
			}
		}
	}

	function keyUp(event) {
		if (props.role === roleIds.pilot) {
			if (event.key === "w") {
				controls.forward = false;
				controls.changed = true;
			} else if (event.key === "a") {
				controls.left = false;
				controls.changed = true;
			} else if (event.key === "s") {
				controls.backward = false;
				controls.changed = true;
			} else if (event.key === "d") {
				controls.right = false;
				controls.changed = true;
			}
		}
	}

	function mouseDown(event) {
		if (event.button !== 0) {
			return;
		}

		if (props.role === roleIds.gunner) {
			controls.firingLazer = true;
			controls.changed = true;
		} else {
			controls.clientOrigin = {x: event.clientX, y: event.clientY};
		}
	}

	function mouseUp(event) {
		if (event.button !== 0) {
			return;
		}

		if (props.role === roleIds.gunner) {
			controls.firingLazer = false;
			controls.changed = true;
		} else {
			const origin = game.current.renderer.viewportToWorld(
				controls.clientOrigin.x,
				controls.clientOrigin.y,
				game.current.camera,
			);

			const v = Vector2D.clone(game.current.renderer.viewportToWorld(
				event.clientX,
				event.clientY,
				game.current.camera,
			)).sub(origin);

			const length = v.length;
			if (length > 10) {
				v.mul(10 / length);
			}

			const action = {
				type: Action.debug,
				frameId: game.current.frameId,
				position: origin,
				velocity: v.times(5),
			};

			game.current.addAction(action);
			props.channel.sendAction(action);
		}
	}

	function mouseMove(event) {
		if (props.role === roleIds.gunner) {
			controls.clientAim = {
				x: event.clientX,
				y: event.clientY,
			};
			controls.aimDirty = true;
			controls.changed = true;
		}
	}

	return j({canvas: {
		style: {display: "block", width: "100%", height: "100%"},
		onMouseDown: mouseDown,
		onMouseUp: mouseUp,
		onWheel: wheel,
		ref: canvas,
	}});
}
