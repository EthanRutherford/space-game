import React, {useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import {Action} from "Shared/serial";
import {dataChannel} from "../../logic/data-channel";
import {useGame} from "./use-game";
import {Viewport} from "./viewport";
const {Vector2D} = VectorMath;

export function Gunner({userId}) {
	const {game, canvas} = useGame(userId);

	useEffect(() => {
		const controls = {};

		function mouseDown(event) {
			if (event.button === 0) {
				controls.firingLazer = true;
				controls.changed = true;
			}
		}

		function mouseUp(event) {
			if (event.button === 0) {
				controls.firingLazer = false;
				controls.changed = true;
			}
		}

		function mouseMove(event) {
			controls.clientAim = {
				x: event.clientX,
				y: event.clientY,
			};
			controls.aimDirty = true;
			controls.changed = true;
		}

		function blur() {
			controls.firingLazer = false;
			controls.changed = true;
		}

		function postSolve(frameId) {
			if (controls.changed) {
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
				dataChannel.sendAction(action);

				controls.changed = false;
			}
		}

		game.current.addPostSolveHandler(postSolve);
		window.addEventListener("mousedown", mouseDown);
		window.addEventListener("mouseup", mouseUp);
		window.addEventListener("mousemove", mouseMove);
		window.addEventListener("blur", blur);
		canvas.current.addEventListener("wheel", () => {
			controls.aimDirty = true;
			controls.changed = true;
		});

		return () => {
			game.current.removePostSolveHandler(postSolve);
			window.removeEventListener("mousedown", mouseDown);
			window.removeEventListener("mouseup", mouseUp);
			window.removeEventListener("mousemove", mouseMove);
			window.removeEventListener("blur", blur);
		};
	}, []);

	return <Viewport game={game} canvas={canvas} />;
}
