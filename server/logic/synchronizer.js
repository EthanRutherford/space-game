import {performance} from "perf_hooks";
import {Timing, bytify} from "Shared/serial";

const KEEP_COUNT = 100;
const BURST_COUNT = 20;
const DELAY_MS = 30 * 1000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function pingPong(ws) {
	return new Promise((resolve, reject) => {
		const success = () => resolve(performance.now() - start);
		ws.once("pong", success);

		const start = performance.now();
		ws.ping((error) => {
			if (error) {
				ws.off("pong", success);
				reject(error);
			}
		});
	});
}

async function doBurst(ws) {
	try {
		const results = [];
		for (let i = 0; i < BURST_COUNT; i++) {
			results.push(await pingPong(ws));
		}

		return results;
	} catch (error) {
		return null;
	}
}

function statisticallySignificantMean(dataPoints) {
	const total = dataPoints.reduce((t, v) => t + v, 0);
	const avg = total / dataPoints.length;

	const devTotal = dataPoints.reduce((t, v) => t + (v - avg) ** 2, 0);
	const stdDev = Math.sqrt(devTotal / dataPoints.length);

	const significant = dataPoints.filter((v) => Math.abs(v - avg) < stdDev * 2);
	const subTotal = significant.reduce((t, v) => t + v, 0);
	return subTotal / significant.length;
}

export async function synchronize(ws, frameZero) {
	let dataPoints = [];

	while (true) {
		const results = await doBurst(ws);
		if (results == null) {
			return;
		}

		dataPoints = results.concat(dataPoints.slice(0, KEEP_COUNT - results.length));
		const rtt = statisticallySignificantMean(dataPoints);
		const transitTime = rtt / 2;

		const gameTime = performance.now() - frameZero;
		ws.send(bytify(Timing, gameTime + transitTime), () => {});
		await delay(DELAY_MS);
	}
}
