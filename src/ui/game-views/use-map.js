import {useRef, useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import {physFPS} from "Shared/game/constants";
const {Vector2D, Rotation} = VectorMath;

// (360 deg) / (10s * stepsPerSec)
const lidarStepSize = (Math.PI * 2) / (10 * physFPS);
const rayCount = 25;
const getScale = (size) => Math.max(size.width, size.height) / 10000;
function resize(canvas) {
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;

	if (height !== canvas.height || width !== canvas.width) {
		canvas.width = width;
		canvas.height = height;
	}

	return {width, height};
}

export function toGameCoords(canvas, state, event) {
	const x = event.nativeEvent.offsetX;
	const y = event.nativeEvent.offsetY;

	const size = resize(canvas);
	const scale = getScale(size);
	const oX = size.width / 2;
	const oY = size.height / 2;

	const offX = (x - oX) / scale;
	const offY = (oY - y) / scale;

	const shipPos = state.ship.body.position;
	return new Vector2D(shipPos.x + offX, shipPos.y + offY);
}

export function useMap(game) {
	const canvas = useRef();

	useEffect(() => {
		const context = canvas.current.getContext("2d");
		let counter = 0;
		function postSolve() {
			// fade last image
			const size = resize(canvas.current);
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
			const scale = getScale(size);
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

			// draw waypoint
			if (gameState.ship.controls.waypoint != null) {
				const waypoint = gameState.ship.controls.waypoint;
				const position = gameState.ship.body.position;
				const relativePos = waypoint.minus(position);
				const eX = oX + relativePos.x * scale;
				const eY = oY - relativePos.y * scale;
				context.fillStyle = "#5588ff";
				context.beginPath();
				context.arc(eX, eY, 2, 0, Math.PI * 2, true);
				context.closePath();
				context.fill();
			}
		}

		game.current.addPostSolveHandler(postSolve);
		return () => game.current.removePostSolveHandler(postSolve);
	}, []);

	return canvas;
}
