import React, {useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import {Action} from "Shared/serial";
import {dataChannel} from "../../logic/data-channel";
import {useGame} from "./use-game";
import {Viewport} from "./viewport";
const {Vector2D} = VectorMath;

export function Spectator({userId}) {
	const {game, canvas} = useGame(userId);

	useEffect(() => {
		let clientOrigin = {};

		function mouseDown(event) {
			if (event.button === 0) {
				clientOrigin = {x: event.clientX, y: event.clientY};
			}
		}

		function mouseUp(event) {
			if (event.button === 0) {
				const origin = game.current.renderer.viewportToWorld(
					clientOrigin.x,
					clientOrigin.y,
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
				dataChannel.sendAction(action);
			}
		}

		window.addEventListener("mousedown", mouseDown);
		window.addEventListener("mouseup", mouseUp);
		return () => {
			window.removeEventListener("mousedown", mouseDown);
			window.removeEventListener("mouseup", mouseUp);
		};
	}, []);

	return <Viewport game={game} canvas={canvas} />;
}
