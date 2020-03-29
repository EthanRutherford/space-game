const {Worker, isMainThread, parentPort} = require("worker_threads");

if (isMainThread) {
	let worker = null;
	const setupWorker = () => {
		worker = new Worker(__filename);
		// eslint-disable-next-line no-console
		worker.on("error", console.warn);
		worker.on("exit", setupWorker);
	};

	module.exports = class ServerPlugin {
		apply(compiler) {
			setupWorker();
			compiler.hooks.assetEmitted.tap("ServerPlugin", (_, content) => {
				worker.postMessage(content.toString());
			});
		}
	};
} else {
	let currentServer = null;

	parentPort.on("message", (content) => {
		if (currentServer != null) {
			currentServer.close();
		}

		// eslint-disable-next-line no-eval
		const compiled = eval(content);
		currentServer = compiled.createServer();
	});
}
