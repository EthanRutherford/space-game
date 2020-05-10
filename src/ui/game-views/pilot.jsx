import React, {useEffect} from "react";
import {Action} from "Shared/serial";
import {useGame} from "./use-game";
import {Viewport} from "./viewport";

export function Pilot({userId, channel}) {
	const {game, canvas} = useGame(userId, channel);

	useEffect(() => {
		const controls = {};

		function keyDown(event) {
			if (event.key === "w") {
				controls.forward = true;
			} else if (event.key === "a") {
				controls.left = true;
			} else if (event.key === "s") {
				controls.backward = true;
			} else if (event.key === "d") {
				controls.right = true;
			}
		}

		function keyUp(event) {
			if (event.key === "w") {
				controls.forward = false;
			} else if (event.key === "a") {
				controls.left = false;
			} else if (event.key === "s") {
				controls.backward = false;
			} else if (event.key === "d") {
				controls.right = false;
			}
		}

		function blur() {
			controls.forward = controls.backward = controls.left = controls.right = false;
		}

		game.current.postSolve = (frameId) => {
			const action = {
				type: Action.flightControls,
				frameId,
				...controls,
			};

			game.current.addAction(action);
			channel.sendAction(action);
		};

		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		window.addEventListener("blur", blur);
		return () => {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
			window.removeEventListener("blur", blur);
		};
	}, []);

	return <Viewport game={game} canvas={canvas} />;
}
