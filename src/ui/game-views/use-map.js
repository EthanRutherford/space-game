import {useRef, useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import {physFPS} from "Shared/game/constants";
const {Vector2D, Rotation} = VectorMath;

// (360 deg) / (10s * stepsPerSec)
const lidarStepSize = (Math.PI * 2) / (10 * physFPS);
const rayCount = 25;

export function useMap(game) {
	const canvas = useRef();

	useEffect(() => {
		function resize() {
			const width = canvas.current.clientWidth;
			const height = canvas.current.clientHeight;

			if (height !== canvas.current.height || width !== canvas.current.width) {
				canvas.current.width = width;
				canvas.current.height = height;
			}

			return {width, height};
		}

		const context = canvas.current.getContext("2d");
		let counter = 0;
		function postSolve() {
			// fade last image
			const size = resize();
			const image = context.getImageData(0, 0, size.width, size.height);
			for (let i = 0; i < image.data.length; i += 4) {
				image.data[i + 3] -= 1;
			}

			context.putImageData(image, 0, 0);

			// ensure the radar is powered
			const gameState = game.current.getGameState();
			const mapPower = gameState.ship.controls.mapPower;
			if (mapPower === 0) {
				return;
			}

			// raycasts
			const p1 = gameState.ship.body.position;
			const radians = counter++ * -lidarStepSize;
			const stepRad = (1 / rayCount) * -lidarStepSize;

			const castResults = [];
			for (let i = 0; i < rayCount; i++) {
				const r = new Rotation(radians + stepRad * i);
				const p2 = r.mul(new Vector2D(0, 1250 * mapPower)).add(p1);

				let frac = null;
				gameState.solver.raycast({
					p1, p2,
					callback(castData) {
						frac = castData.fraction;
					},
				});

				const hit = frac != null;
				const length = 1250 * mapPower * (hit ? frac : 1);
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
		}

		game.current.addPostSolveHandler(postSolve);
		return () => game.current.removePostSolveHandler(postSolve);
	}, []);

	return canvas;
}
