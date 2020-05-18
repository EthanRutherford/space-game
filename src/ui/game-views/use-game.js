import {useState, useRef, useEffect} from "react";
import {Timing, Sync} from "Shared/serial";
import {Game} from "../../logic/game";
import {dataChannel} from "../../logic/data-channel";

export function useGame(userId) {
	const canvas = useRef();
	const game = useRef();
	useEffect(() => {
		// create game
		game.current = new Game(canvas.current, userId);

		// listen for updates
		dataChannel.addListener((message, timeStamp) => {
			if (message.type === Timing) {
				game.current.updateGameTime(message.data.time, timeStamp);
			} else if (message.type === Sync) {
				game.current.updateSync(message.data);
			}
		});
	}, []);

	return {game, canvas};
}

export function useDerived(game, getValue) {
	const [value, setValue] = useState();

	useEffect(() => {
		const postSolve = () => {
			setValue(getValue(game.current.getGameState()));
		};

		game.current.addPostSolveHandler(postSolve);
		return () => game.current.removePostSolveHandler(postSolve);
	}, []);

	return value;
}
