import React, {useRef, useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import {physFPS} from "Shared/game/constants";
import {useGame} from "./use-game";
import {Viewport} from "./viewport";
import styles from "../../styles/engineer";
const {Vector2D, Rotation} = VectorMath;

// (360 deg) / (10s * stepsPerSec)
const lidarStepSize = (Math.PI * 2) / (10 * physFPS);
const rayCount = 25;

export function Engineer({userId, channel}) {
	const {game, canvas} = useGame(userId, channel);
	const mapCanvas = useRef();

	useEffect(() => {
		function resize() {
			const width = mapCanvas.current.clientWidth;
			const height = mapCanvas.current.clientHeight;

			if (height !== mapCanvas.current.height || width !== mapCanvas.current.width) {
				mapCanvas.current.width = width;
				mapCanvas.current.height = height;
			}

			return {width, height};
		}

		const context = mapCanvas.current.getContext("2d");
		let counter = 0;
		game.current.postSolve = () => {
			// fade last image
			const size = resize();
			const image = context.getImageData(0, 0, size.width, size.height);
			for (let i = 0; i < image.data.length; i += 4) {
				image.data[i + 3] -= 1;
			}

			context.putImageData(image, 0, 0);

			// raycasts
			const gameState = game.current.getGameState();
			const p1 = gameState.ship.body.position;
			const radians = counter++ * -lidarStepSize;
			const stepRad = (1 / rayCount) * -lidarStepSize;

			const castResults = [];
			for (let i = 0; i < rayCount; i++) {
				const r = new Rotation(radians + stepRad * i);
				const p2 = r.mul(new Vector2D(0, 5000)).add(p1);

				let frac = null;
				gameState.solver.raycast({
					p1, p2,
					callback(castData) {
						frac = castData.fraction;
					},
				});

				const hit = frac != null;
				const length = 5000 * (hit ? frac : 1);
				const contact = hit ? r.mul(new Vector2D(0, length)) : null;
				castResults.push({length, contact, radians: r.radians});
			}

			// paint
			const scale = Math.max(size.width, size.height) / 10000;
			const oX = size.width / 2;
			const oY = size.height / 2;

			// draw beam
			context.fillStyle = "#ddffdd20";
			context.beginPath();
			context.moveTo(oX, oY);
			for (const result of castResults) {
				const startAngle = (-Math.PI / 2) - result.radians;
				const endAngle = startAngle - stepRad;
				const length = result.length * scale;
				context.arc(oX, oY, length, startAngle, endAngle);
			}

			context.closePath();
			context.fill();

			// draw center
			context.fillStyle = "#ffffff";
			context.beginPath();
			context.arc(oX, oY, 2, 0, Math.PI * 2, true);
			context.closePath();
			context.fill();

			// draw points
			for (const result of castResults) {
				if (result.contact != null) {
					const eX = oX + result.contact.x * scale;
					const eY = oY - result.contact.y * scale;
					context.fillStyle = "#ddffdd";
					context.beginPath();
					context.arc(eX, eY, 2, 0, Math.PI * 2, true);
					context.closePath();
					context.fill();
				}
			}
		};
	}, []);

	return (
		<div className={styles.container}>
			<div className={styles.sidebar}>Engineer controls would go here</div>
			<Viewport className={styles.view} game={game} canvas={canvas} />
			<canvas className={styles.map} ref={mapCanvas} />
		</div>
	);
}
