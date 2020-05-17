import React, {useState, useEffect, useRef, useCallback} from "react";
import {Action} from "Shared/serial";
import {powerLimits} from "Shared/game/actions";
import {dataChannel} from "../../logic/data-channel";
import {SteppedSlider} from "../inputs/stepped-slider";
import {useGame} from "./use-game";
import {useMap} from "./use-map";
import {Viewport} from "./viewport";
import styles from "../../styles/engineer";

function doPowerUpdate(game, power) {
	const action = {
		type: Action.engineerControls,
		frameId: game.current.frameId,
		enginePower: power.engine,
		shieldPower: power.shield,
		gunPower: power.gun,
		mapPower: power.map,
	};

	game.current.addAction(action);
	dataChannel.sendAction(action);

	return power;
}
function usePower(game) {
	const currentPower = useRef();
	const [power, setPower] = useState({
		engine: 0,
		shield: 0,
		gun: 0,
		map: 0,
	});

	currentPower.current = power;
	useEffect(() => {
		function postSolve() {
			const gameState = game.current.getGameState();
			const controls = gameState.ship.controls;
			if (
				controls.enginePower !== currentPower.engine ||
				controls.shieldPower !== currentPower.shield ||
				controls.gunPower !== currentPower.gun ||
				controls.mapPower !== currentPower.map
			) {
				setPower({
					engine: controls.enginePower,
					shield: controls.shieldPower,
					gun: controls.gunPower,
					map: controls.mapPower,
				});
			}
		}

		game.current.addPostSolveHandler(postSolve);
		return () => game.current.removePostSolveHandler(postSolve);
	}, []);

	return {
		power,
		remaining: powerLimits.total - (power.engine + power.shield + power.gun + power.map),
		set: {
			engine: useCallback((val) => setPower(
				(prev) => doPowerUpdate(game, {...prev, engine: val}),
			), []),
			shield: useCallback((val) => setPower(
				(prev) => doPowerUpdate(game, {...prev, shield: val}),
			), []),
			gun: useCallback((val) => setPower(
				(prev) => doPowerUpdate(game, {...prev, gun: val}),
			), []),
			map: useCallback((val) => setPower(
				(prev) => doPowerUpdate(game, {...prev, map: val}),
			), []),
		},
	};
}

function PowerSlider({value, onChange, remaining, label}) {
	return (
		<div className={styles.sliderContainer}>
			<SteppedSlider
				trackClass={styles.track}
				thumbClass={styles.thumb}
				stopClass={styles.stop}
				steps={powerLimits.individual}
				value={value}
				limit={remaining + value}
				onChange={onChange}
			/>
			<div className={styles.sliderLabel}>
				{label}
			</div>
		</div>
	);
}

export function Engineer({userId}) {
	const {game, canvas} = useGame(userId);
	const mapCanvas = useMap(game);
	const {power, remaining, set} = usePower(game);

	return (
		<div className={styles.container}>
			<div className={styles.sidebar}>
				<h1>Power stuff YEEEEEEEEEEEEEEEEEEEAHHHHHHHHHHHH!!!!!!!!!!!</h1>
				<div className={styles.sliderPanel}>
					<PowerSlider
						value={power.engine}
						onChange={set.engine}
						remaining={remaining}
						label="ENGINE"
					/>
					<PowerSlider
						value={power.shield}
						onChange={set.shield}
						remaining={remaining}
						label="SHIELD"
					/>
					<PowerSlider
						value={power.gun}
						onChange={set.gun}
						remaining={remaining}
						label="GUN"
					/>
					<PowerSlider
						value={power.map}
						onChange={set.map}
						remaining={remaining}
						label="MAP"
					/>
				</div>
			</div>
			<Viewport className={styles.view} game={game} canvas={canvas} />
			<canvas className={styles.map} ref={mapCanvas} />
		</div>
	);
}
