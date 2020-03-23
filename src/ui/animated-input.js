import {useState, forwardRef} from "react";
import j from "react-jenny";

export const AnimatedInput = forwardRef(function AnimatedInput({
	className,
	hoverClass,
	activeClass,
	onClick,
	...rest
}, ref) {
	const [state, setState] = useState({});

	function animationHandler() {
		if (state.hovering && !state.hovered) {
			setState({});
		}
		if (state.active) {
			setState({});
			if (onClick instanceof Function) onClick();
		}
	}

	const type = activeClass ? "button" : "input";
	const classToUse = `${className} ${state.active ? activeClass : state.hovering ? hoverClass : ""}`;

	return j({[type]: {
		className: classToUse,
		onMouseEnter: () => setState({hovered: true, hovering: true}),
		onMouseLeave: () => setState((old) => ({...old, hovered: false})),
		onClick: () => activeClass && setState({active: true}),
		onAnimationEnd: animationHandler,
		onAnimationIteration: animationHandler,
		ref,
		...rest,
	}});
});
