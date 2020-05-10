import React from "react";
import {Math} from "boxjs";

export function Viewport({game, canvas}) {
	return (
		<canvas
			style={{display: "block", width: "100%", height: "100%"}}
			onWheel={(event) => {
				game.current.camera.zoom = Math.clamp(
					game.current.camera.zoom + event.deltaY / 100, 5, 50,
				);
			}}
			ref={canvas}
		/>
	);
}
