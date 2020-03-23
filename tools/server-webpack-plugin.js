let currentServer = null;

class HelloCompilationPlugin {
	apply(compiler) {
		compiler.hooks.assetEmitted.tap("ServerPlugin", (_, content) => {
			if (currentServer != null) {
				currentServer.close();
			}

			try {
				// eslint-disable-next-line no-eval
				const compiled = eval(content.toString());
				currentServer = compiled.createServer();
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(error);
			}
		});
	}
}

module.exports = HelloCompilationPlugin;
