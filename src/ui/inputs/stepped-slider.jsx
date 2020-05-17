import React, {useState, useCallback, useRef, useEffect} from "react";
import {Math as VectorMath} from "boxjs";
import styles from "../../styles/stepped-slider";
const {clamp} = VectorMath;

function eventToPos(event, element, steps, limit) {
	const bounds = element.getBoundingClientRect();
	const coord = event.pageY - bounds.top;
	const placement = clamp((1 - (coord / bounds.height)) * steps, 0, limit);

	if (Math.abs(placement % 1 - .5) > .3) {
		return Math.round(placement) / steps;
	}

	return placement / steps;
}

export function SteppedSlider({
	trackClass,
	thumbClass,
	stopClass,
	steps,
	value,
	limit,
	onChange,
}) {
	const safeLimit = limit == null ? steps : clamp(limit, 0, steps);
	const isClicked = useRef(false);
	const trackRef = useRef();
	const [slideState, setSlideState] = useState(null);

	const onMouseDown = useCallback((event) => {
		setSlideState(eventToPos(event, trackRef.current, steps, safeLimit));
		isClicked.current = true;
	}, [steps, safeLimit]);

	useEffect(() => {
		const onMouseMove = (event) => {
			if (isClicked.current) {
				event.preventDefault();
				setSlideState(eventToPos(event, trackRef.current, steps, safeLimit));
			}
		};

		const onMouseUp = () => {
			if (isClicked.current) {
				isClicked.current = false;
				setSlideState(null);
				onChange(Math.round(
					eventToPos(event, trackRef.current, steps, safeLimit) * steps,
				));
			}
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};
	}, [steps, safeLimit]);

	const pos = slideState != null ? slideState : value / steps;
	return (
		<div
			className={`${styles.track} ${trackClass}`}
			onMouseDown={onMouseDown} ref={trackRef}
		>
			<div
				className={`${styles.thumb} ${slideState == null ? styles.notSliding : ""} ${thumbClass}`}
				style={{bottom: `${pos * 100}%`}}
			/>
			{new Array(steps + 1).fill(0).map((_, i) => (
				<div
					className={`${styles.stop} ${stopClass}`}
					style={{bottom: `${i / steps * 100}%`}}
					key={i}
				/>
			))}
		</div>
	);
}
