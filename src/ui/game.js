const {useRef, useEffect} = require("react");
const j = require("react-jenny");
const {Math: {Vector2D}} = require("boxjs");
const {Timing, Action, ActionAck, Sync} = require("../../shared/serial");
const Game = require("../logic/game");

module.exports = function GameUi(props) {
	const canvas = useRef();
	const game = useRef({});
	useEffect(function() {
		// create game
		game.current = new Game(canvas.current);

		// listen for updates
		props.channel.addListener((message) => {
			if (message.type === Timing) {
				game.current.updateGameTime(message.data.time);
			} else if (message.type === ActionAck) {
				game.current.ackAction(message.data);
			} else if (message.type === Sync) {
				game.current.updateSync(message.data);
			}
		});
	}, []);

	function mouseDown(event) {
		if (event.button !== 0) {
			return;
		}

		const origin = game.current.renderer.viewportToWorld(
			event.clientX,
			event.clientY,
			game.current.camera,
		);
		let v = new Vector2D(0, 0);

		const mouseMove = (innerEvent) => {
			v = Vector2D.clone(game.current.renderer.viewportToWorld(
				innerEvent.clientX,
				innerEvent.clientY,
				game.current.camera,
			)).sub(origin);

			const length = v.length;
			if (length > 10) {
				v.mul(10 / length);
			}
		};

		const mouseUp = (innerEvent) => {
			if (innerEvent.button !== 0) {
				return;
			}

			const action = {
				type: Action.debug,
				frameId: game.current.frameId,
				x: origin.x, y: origin.y,
				dx: v.x * 5, dy: v.y * 5,
			};

			if (game.current.tryAddAction(action)) {
				props.channel.sendAction(action);
			}

			window.removeEventListener("mousemove", mouseMove);
			window.removeEventListener("mouseup", mouseUp);
		};

		window.addEventListener("mousemove", mouseMove);
		window.addEventListener("mouseup", mouseUp);
	}

	function wheel(event) {
		game.current.camera.zoom = Math.max(
			game.current.camera.zoom + event.deltaY / 100, 1,
		);
	}

	return j({canvas: {
		style: {display: "block", width: "100%", height: "100%"},
		onMouseDown: mouseDown,
		onWheel: wheel,
		ref: canvas,
	}});
};
