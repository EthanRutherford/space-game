/* eslint-disable no-process-env */
const {DefinePlugin} = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const ServerWebpackPlugin = require("./tools/server-webpack-plugin");

const port = 9000;

module.exports = (env) => [{
	entry: "./src/main.jsx",
	output: {
		filename: "main.js",
		publicPath: "/dist",
	},
	plugins: [
		new MiniCssExtractPlugin({filename: "styles.css"}),
		new DefinePlugin({IS_SERVER: JSON.stringify(false)}),
	],
	module: {
		rules: [
			{
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
				use: "file-loader",
			}, {
				test: /\.jsx$/,
				exclude: /node_modules/,
				use: "babel-loader",
			}, {
				test: /\.worker\.js$/,
				use: "worker-loader",
			},
		],
	},
	resolve: {
		extensions: [".js", ".jsx", ".json", ".css"],
		alias: {
			Shared: path.resolve(__dirname, "shared/"),
		},
	},
	mode: env === "prod" ? "production" : "development",
	devtool: env === "prod" ? "" : "eval-cheap-module-source-map",
	devServer: {
		open: true,
		publicPath: "/dist",
		host: "0.0.0.0",
		port,
		public: `localhost:${port}`,
	},
}, {
	entry: process.env.WEBPACK_DEV_SERVER ? "./server/logic/server.js" : "./server/main.js",
	output: {filename: "server.js"},
	plugins: [
		new DefinePlugin({IS_SERVER: JSON.stringify(true)}),
	].concat(process.env.WEBPACK_DEV_SERVER ? [new ServerWebpackPlugin()] : []),
	resolve: {
		extensions: [".js", ".json"],
		alias: {
			Shared: path.resolve(__dirname, "shared/"),
		},
	},
	mode: env === "prod" ? "production" : "development",
	devtool: env === "prod" ? "" : "eval-cheap-module-source-map",
	target: "node",
}];
