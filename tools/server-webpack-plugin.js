let currentServer = null;

class HelloCompilationPlugin {
	apply(compiler) {
		compiler.hooks.assetEmitted.tap("ServerPlugin", (_, content) => {
			if (currentServer != null) {
				currentServer.close();
			}

			// eslint-disable-next-line no-eval
			const createServer = eval(content.toString());
			currentServer = createServer();
		});
	}
}

module.exports = HelloCompilationPlugin;
