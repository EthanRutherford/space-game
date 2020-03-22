const {ImageLoader} = require("2d-gl");
const shipUrl = require("../images/ship.png");

const loader = new ImageLoader();

// preload sprites
loader.get("ship", shipUrl);

module.exports = loader;
