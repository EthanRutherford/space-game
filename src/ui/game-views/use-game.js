import {useRef, useEffect} from "react";
import {Timing, Sync} from "Shared/serial";
import {Game} from "../../logic/game";

export function useGame(userId, channel) {
	const canvas = useRef();
	const game = useRef();
	useEffect(() => {
		// create game
		game.current = new Game(canvas.current, userId);

		// listen for updates
		channel.addListener((message) => {
			if (message.type === Timing) {
				game.current.updateGameTime(message.data.time);
			} else if (message.type === Sync) {
				game.current.updateSync(message.data);
			}
		});
	}, []);

	return {game, canvas};
}
