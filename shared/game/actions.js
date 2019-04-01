const {
	Math: {Vector2D},
	Body,
	Shapes: {Polygon},
} = require("boxjs");

function createBox({x, y, dx, dy}) {
	const body = new Body({
		position: new Vector2D(x, y),
		velocity: new Vector2D(dx, dy),
		shapes: [new Polygon().setAsBox(.5, .5)],
	});

	return body;
}

module.exports = {createBox};
