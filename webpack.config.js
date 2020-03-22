const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const createServer = require("./server/logic/server");
const path = require("path");

const port = 9000;

module.exports = (env) => ({
	entry: "./src/main.js",
	output: {filename: "main.js"},
	plugins: [new MiniCssExtractPlugin({filename: "styles.css"})],
	module: {
		rules: [{
			test: /\.css$/,
			use: [
				MiniCssExtractPlugin.loader,
				{loader: "css-loader", options: {
					camelCase: "only",
					localIdentName: "[name]__[local]--[hash:base64:5]",
					modules: true,
				}},
			],
		}, {
			test: /.png$/,
			use: [
				{loader: "file-loader", options: {
					publicPath: "/dist",
					esModule: false,
				}},
			],
		}],
	},
	resolve: {
		extensions: [".js", ".json", ".css"],
		alias: {
			Shared: path.resolve(__dirname, "shared/"),
		},
	},
	mode: env === "prod" ? "production" : "development",
	devtool: env === "prod" ? "" : "eval-source-map",
	devServer: {
		open: true,
		publicPath: "/dist",
		host: "0.0.0.0",
		port,
		public: `localhost:${port}`,
		before: (_, server) => createServer(server),
	},
});
