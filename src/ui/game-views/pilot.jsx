import React, {useEffect, useState} from "react";
import {Action} from "Shared/serial";
import {dataChannel} from "../../logic/data-channel";
import {useGame, useDerived} from "./use-game";
import {Viewport} from "./viewport";
import styles from "../../styles/pilot.css";

export function Pilot({userId}) {
	const {game, canvas} = useGame(userId);
	const waypoint = useDerived(game, (state) => {
		if (state.ship.controls.waypoint == null) {
			return null;
		}

		const pos = state.ship.body.position;
		const wp = state.ship.controls.waypoint;
		const angle = Math.atan2(wp.y - pos.y, wp.x - pos.x) * 180 / Math.PI;
		return {angle: -angle + 90, distance: wp.minus(pos).length};
	});

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

		function postSolve(frameId) {
			const action = {
				type: Action.flightControls,
				frameId,
				...controls,
			};

			game.current.addAction(action);
			dataChannel.sendAction(action);
		}

		game.current.addPostSolveHandler(postSolve);
		window.addEventListener("keydown", keyDown);
		window.addEventListener("keyup", keyUp);
		window.addEventListener("blur", blur);
		return () => {
			game.current.removePostSolveHandler(postSolve);
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
			window.removeEventListener("blur", blur);
		};
	}, []);

	return (
		<div className={styles.container}>
			<div className={styles.compass}>
				{waypoint != null && (
					<>
						<div
							className={styles.pointer}
							style={{transform: `translate(-50%, -50%) rotate(${waypoint.angle}deg)`}}
						/>
						<div className={styles.distance}>
							{Math.round(waypoint.distance)}m
						</div>
					</>
				)}
			</div>
			<Viewport game={game} canvas={canvas} />
		</div>
	);
}
