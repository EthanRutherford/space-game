import React, {useRef, useMemo, useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import {roleIds} from "Shared/game/roles";
import {Timing, Action, Sync} from "Shared/serial";
import {Game} from "../logic/game";
const {Vector2D} = VectorMath;

export function GameUi({userManager}) {
	const canvas = useRef();
	const game = useRef();
	const controls = useMemo(() => ({
		flight: {},
		aim: new Vector2D(0, 2),
		changed: false,
	}), []);

	useEffect(function() {
		// create game
		game.current = new Game(canvas.current, userManager.userId);
		game.current.postSolve = postSolve;

		// listen for updates
		userManager.channel.addListener((message) => {
			if (message.type === Timing) {
				game.current.updateGameTime(message.data.time);
			} else if (message.type === Sync) {
				game.current.updateSync(message.data);
			}
		});

		// add global listeners
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		window.addEventListener("mousedown", mouseDown);
		window.addEventListener("mouseup", mouseUp);
		window.addEventListener("mousemove", mouseMove);
		window.addEventListener("blur", blur);

		return () => {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
			window.removeEventListener("mousedown", mouseDown);
			window.removeEventListener("mouseup", mouseUp);
			window.removeEventListener("mousemove", mouseMove);
			window.removeEventListener("blur", blur);
		};
	}, []);

	function postSolve(frameId) {
		if (controls.changed) {
			if (userManager.role === roleIds.pilot) {
				const action = {
					type: Action.flightControls,
					frameId,
					...controls.flight,
				};

				game.current.addAction(action);
				userManager.channel.sendAction(action);
			} else if (userManager.role === roleIds.gunner) {
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
				userManager.channel.sendAction(action);
			}
			controls.changed = false;
		}
	}

	function wheel(event) {
		game.current.camera.zoom = Math.max(
			game.current.camera.zoom + event.deltaY / 100, 1,
		);

		if (userManager.role === roleIds.gunner) {
			controls.aimDirty = true;
			controls.changed = true;
		}
	}

	function keyDown(event) {
		if (userManager.role === roleIds.pilot) {
			if (event.key === "w") {
				controls.flight.forward = true;
				controls.changed = true;
			} else if (event.key === "a") {
				controls.flight.left = true;
				controls.changed = true;
			} else if (event.key === "s") {
				controls.flight.backward = true;
				controls.changed = true;
			} else if (event.key === "d") {
				controls.flight.right = true;
				controls.changed = true;
			}
		}
	}

	function keyUp(event) {
		if (userManager.role === roleIds.pilot) {
			if (event.key === "w") {
				controls.flight.forward = false;
				controls.changed = true;
			} else if (event.key === "a") {
				controls.flight.left = false;
				controls.changed = true;
			} else if (event.key === "s") {
				controls.flight.backward = false;
				controls.changed = true;
			} else if (event.key === "d") {
				controls.flight.right = false;
				controls.changed = true;
			}
		}
	}

	function mouseDown(event) {
		if (event.button !== 0) {
			return;
		}

		if (userManager.role === roleIds.gunner) {
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

		if (userManager.role === roleIds.gunner) {
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
			userManager.channel.sendAction(action);
		}
	}

	function mouseMove(event) {
		if (userManager.role === roleIds.gunner) {
			controls.clientAim = {
				x: event.clientX,
				y: event.clientY,
			};
			controls.aimDirty = true;
			controls.changed = true;
		}
	}

	function blur() {
		controls.flight = {};
		controls.firingLazer = false;
		controls.changed = true;
	}

	return (
		<canvas
			style={{display: "block", width: "100%", height: "100%"}}
			onWheel={wheel}
			ref={canvas}
		/>
	);
}
