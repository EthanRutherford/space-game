const {useRef, useEffect} = require("react");
const j = require("react-jenny");
const {Math: {Vector2D}} = require("boxjs");
const {Timing, ActionAck} = require("../../shared/serial");
const MessageChannel = require("../logic/message-channel");
const Game = require("../logic/game");

module.exports = function GameUi(props) {
	const canvas = useRef();
	const data = useRef({});
	useEffect(function() {
		// create game
		data.current.game = new Game(canvas.current);

		// listen for updates
		data.current.channel = new MessageChannel(`ws://${props.ip}:12345`);
		data.current.channel.onMessage = (message) => {
			if (message.type === Timing) {
				data.current.game.updateGameTime(message.data.time);
			} else if (message.type === ActionAck) {
				data.current.game.ackAction(message.data);
			} else {
				data.current.game.updateSync(message.data);
			}
		};
	}, []);

	function mouseDown(event) {
		const {game, channel} = data.current;
		if (event.button !== 0) {
			return;
		}

		const origin = game.renderer.viewportToWorld(
			event.clientX,
			event.clientY,
			game.camera,
		);
		let v = new Vector2D(0, 0);

		const mouseMove = (innerEvent) => {
			v = Vector2D.clone(game.renderer.viewportToWorld(
				innerEvent.clientX,
				innerEvent.clientY,
				game.camera,
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
				x: origin.x, y: origin.y,
				dx: v.x * 5, dy: v.y * 5,
			};

			if (game.tryAddAction(action)) {
				channel.send(game.frameId, action);
			}

			window.removeEventListener("mousemove", mouseMove);
			window.removeEventListener("mouseup", mouseUp);
		};

		window.addEventListener("mousemove", mouseMove);
		window.addEventListener("mouseup", mouseUp);
	}

	function wheel(event) {
		data.current.game.camera.zoom = Math.max(
			data.current.game.camera.zoom + event.deltaY / 100,
			1,
		);
	}

	return j({canvas: {
		style: {display: "block", width: "100%", height: "100%"},
		onMouseDown: mouseDown,
		onWheel: wheel,
		ref: canvas,
	}});
};
