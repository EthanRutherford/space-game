import React, {useRef, useCallback} from "react";
import {Action} from "Shared/serial";
import {powerLimits} from "Shared/game/actions";
import {dataChannel} from "../../logic/data-channel";
import {SteppedSlider} from "../inputs/stepped-slider";
import {useGame, useDerived} from "./use-game";
import {useMap, toGameCoords} from "./use-map";
import {Viewport} from "./viewport";
import styles from "../../styles/engineer";

function usePower(game) {
	const updatePower = useRef();
	const power = {
		engine: useDerived(game, (state) => state.ship.controls.enginePower),
		shield: useDerived(game, (state) => state.ship.controls.shieldPower),
		gun: useDerived(game, (state) => state.ship.controls.gunPower),
		map: useDerived(game, (state) => state.ship.controls.mapPower),
	};

	updatePower.current = (key, value) => {
		const action = {
			type: Action.powerControls,
			frameId: game.current.frameId,
			enginePower: power.engine,
			shieldPower: power.shield,
			gunPower: power.gun,
			mapPower: power.map,
			[key]: value,
		};

		game.current.addAction(action);
		dataChannel.sendAction(action);
	};

	return {
		power,
		remaining: powerLimits.total - (power.engine + power.shield + power.gun + power.map),
		set: {
			engine: useCallback((v) => updatePower.current("enginePower", v), []),
			shield: useCallback((v) => updatePower.current("shieldPower", v), []),
			gun: useCallback((v) => updatePower.current("gunPower", v), []),
			map: useCallback((v) => updatePower.current("mapPower", v), []),
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

	const onClick = useCallback((event) => {
		event.preventDefault();
		const action = {
			type: Action.waypointControls,
			frameId: game.current.frameId,
		};

		if (event.button === 0) {
			const state = game.current.getGameState();
			action.waypoint = toGameCoords(mapCanvas.current, state, event);
		}

		game.current.addAction(action);
		dataChannel.sendAction(action);
	}, []);

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
			<canvas
				className={styles.map}
				onClick={onClick}
				onContextMenu={onClick}
				ref={mapCanvas}
			/>
		</div>
	);
}
